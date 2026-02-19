import { SYSTEM_INSTRUCTION } from '../constants';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============================================================
// ttk.homes OpenAI-Compatible API Configuration
// Supports: gemini-2.5-pro-cli, gemini-3-flash-preview-cli, etc.
// ============================================================

const TTK_API_BASE = 'https://api.ttk.homes/v1';
const TTK_MODEL_CHAT = 'gemini-3-flash-preview-cli';   // Fast flash model for chat
const TTK_MODEL_VISION = 'gemini-2.5-pro-cli';          // Pro model for image analysis (stable)

function getApiKey(): string {
  const key = (import.meta as any).env?.VITE_TTK_API_KEY || '';
  if (!key) {
    console.warn('VITE_TTK_API_KEY not set — AI features will not work');
  }
  return key;
}

/**
 * Fetch with automatic retry on 429 (rate limit) errors.
 * Retries up to maxRetries times with exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 2
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429 && attempt < maxRetries) {
      const waitSeconds = 10 * Math.pow(2, attempt);
      console.warn(`Rate limited (429). Retry ${attempt + 1}/${maxRetries} in ${waitSeconds}s...`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }

    return response;
  }
  return fetch(url, options);
}

/**
 * Call OpenAI-compatible chat completions API at ttk.homes.
 * Works for both local dev and deployed environments.
 */
export const callDeepSeekAPI = async (
  messages: DeepSeekMessage[],
  jsonMode: boolean = false
): Promise<string> => {
  return callTTKDirect(messages, jsonMode);
};

/**
 * Call the ttk.homes OpenAI-compatible API directly from the browser.
 */
async function callTTKDirect(
  messages: DeepSeekMessage[],
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return '⚠️ AI 功能暂不可用：未配置 VITE_TTK_API_KEY 环境变量。';
  }

  const url = `${TTK_API_BASE}/chat/completions`;

  // Convert messages to OpenAI format
  const openaiMessages: { role: string; content: string }[] = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role,
    content: m.content,
  }));

  const requestBody: any = {
    model: TTK_MODEL_CHAT,
    messages: openaiMessages,
    max_tokens: 2048,
  };

  if (jsonMode) {
    requestBody.response_format = { type: 'json_object' };
  }

  // 30-second timeout for chat responses
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`AI API 错误: ${errorMsg}`);
    }

    const data = await response.json();
    clearTimeout(timeoutId);

    try {
      return data.choices[0].message.content;
    } catch (e) {
      console.error('Unexpected API response:', data);
      throw new Error('AI 返回了意外的响应格式');
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('⏱ 请求超时（30秒），请重试');
    }
    throw err;
  }
}

/**
 * 专门用于生成医学报告的函数（文本描述模式）
 */
export const analyzeMedicalImageWithDeepSeek = async (
  imageDescription: string,
  userRole: string
): Promise<string> => {
  const systemPrompt = `你是一个名为 "NeuroGen Core" 的高级医学 AI 专家。
  请严格返回 JSON 格式诊断报告，包含以下字段：
  {
    "summary": "诊断总结",
    "detailedFindings": "详细影像学描述",
    "regions": [{"name": "脑区", "description": "异常描述", "score": 0.0-1.0, "level": "High Risk"|"Moderate"|"Low"}],
    "recommendation": "临床建议",
    "diseaseRisks": [{"name": "疾病", "probability": 0-100, "color": "#hex"}],
    "gwasAnalysis": [{"name": "细胞类型", "score": 0-100}],
    "modelConfidence": [{"name": "类别", "probability": 0-100}],
    "lifecycleProjection": [{"year": 2025, "riskLevel": 0-100}]
  }`;

  const messages: DeepSeekMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请分析以下影像特征并生成报告：${imageDescription}` }
  ];

  return callDeepSeekAPI(messages, true);
};

/**
 * 使用视觉模型分析上传的图片。
 * 无论图片是否为标准脑影像，都会生成一份丰富的分析报告。
 */
export const analyzeImageWithGeminiVision = async (
  imageBase64: string,
  mimeType: string,
  geneFileText?: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('VITE_TTK_API_KEY 未配置');
  }

  const url = `${TTK_API_BASE}/chat/completions`;

  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const systemPrompt = `你是 NeuroGen Core —— 一个专业的神经影像 AI 分析系统。
请分析用户上传的图像和/或数据，生成一份完整的医学分析报告。

重要规则：
1. 如果图像是标准脑部影像（MRI、fMRI、CT、PET等），请根据实际影像内容进行专业分析。
2. 如果图像不是标准脑部影像，请基于神经科学知识生成一份合理的演示分析报告，作为系统功能展示。不要拒绝分析，不要说"无法分析"。
3. 如果提供了基因/细胞数据，请将其纳入分析。如果数据格式不标准，请基于神经科学知识生成合理的关联分析。
4. 无论输入是什么，你都必须返回完整的 JSON 报告。

你必须严格返回以下 JSON 格式（不要包含任何其他文本或 markdown）：
{
  "summary": "200字左右的综合诊断总结，包含主要发现和初步诊断倾向。如果不是标准脑影像，在开头标注[演示模式]",
  "detailedFindings": "详细描述，分为【影像学发现 (fMRI)】和【单细胞/基因发现 (scRNA)】两段，用换行分隔。每段至少100字，内容丰富专业",
  "regions": [
    {"name": "海马体 (Hippocampus)", "description": "该区域的分析描述，至少20字", "score": 0.85, "level": "High Risk"},
    {"name": "前额叶皮层 (Prefrontal Cortex)", "description": "描述", "score": 0.65, "level": "Moderate"},
    {"name": "内嗅皮层 (Entorhinal Cortex)", "description": "描述", "score": 0.45, "level": "Moderate"},
    {"name": "杏仁核 (Amygdala)", "description": "描述", "score": 0.3, "level": "Low"},
    {"name": "扣带回 (Cingulate Gyrus)", "description": "描述", "score": 0.2, "level": "Low"}
  ],
  "recommendation": "分条列出的临床建议（用 1. 2. 3. 4. 编号），至少4条建议",
  "diseaseRisks": [
    {"name": "阿尔茨海默病 (AD)", "probability": 65, "color": "#ef4444"},
    {"name": "轻度认知障碍 (MCI)", "probability": 45, "color": "#f97316"},
    {"name": "帕金森病 (PD)", "probability": 25, "color": "#f59e0b"},
    {"name": "血管性痴呆 (VaD)", "probability": 15, "color": "#10b981"},
    {"name": "正常老化", "probability": 10, "color": "#34d399"}
  ],
  "gwasAnalysis": [
    {"name": "小胶质细胞 (Microglia)", "score": 88, "pValue": "P < 0.001"},
    {"name": "星形胶质细胞 (Astrocyte)", "score": 72, "pValue": "P < 0.005"},
    {"name": "少突胶质细胞 (Oligodendrocyte)", "score": 65, "pValue": "P < 0.01"},
    {"name": "兴奋性神经元 (Excitatory)", "score": 45, "pValue": "P < 0.05"},
    {"name": "抑制性神经元 (Inhibitory)", "score": 30, "pValue": "P = 0.08"}
  ],
  "modelConfidence": [
    {"name": "最可能诊断类型", "probability": 65},
    {"name": "次可能诊断类型", "probability": 25},
    {"name": "Other", "probability": 10}
  ],
  "lifecycleProjection": [
    {"year": 2025, "riskLevel": 35},
    {"year": 2026, "riskLevel": 40},
    {"year": 2027, "riskLevel": 47},
    {"year": 2028, "riskLevel": 55},
    {"year": 2029, "riskLevel": 62},
    {"year": 2030, "riskLevel": 68},
    {"year": 2031, "riskLevel": 74},
    {"year": 2032, "riskLevel": 79},
    {"year": 2033, "riskLevel": 83},
    {"year": 2034, "riskLevel": 87}
  ]
}`;

  const userContent: any[] = [
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType || 'image/jpeg'};base64,${base64Data}`,
      },
    },
    {
      type: 'text',
      text: geneFileText
        ? `请分析这张影像并结合以下基因/细胞数据，生成完整的神经科学多模态诊断报告：\n${geneFileText.substring(0, 3000)}`
        : '请分析这张影像并生成完整的神经科学多模态诊断报告。',
    },
  ];

  const requestBody = {
    model: TTK_MODEL_VISION,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  };

  // 90-second timeout for image analysis
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`AI API 错误: ${errorMsg}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;

    // Parse the JSON response (handle both raw JSON and markdown-wrapped JSON)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonText.trim());
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('分析超时，请重试');
    }
    throw err;
  }
};