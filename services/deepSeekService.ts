import { SYSTEM_INSTRUCTION } from '../constants';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Get the Gemini API key from environment variables.
 */
function getApiKey(): string {
  const key = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  if (!key) {
    console.warn('VITE_GEMINI_API_KEY not set — AI features will not work');
  }
  return key;
}

/**
 * Detect if we're running on a deployed environment (not localhost).
 */
const isDeployed = typeof window !== 'undefined'
  && !window.location.hostname.includes('localhost')
  && !window.location.hostname.includes('127.0.0.1');

const BACKEND_URL = 'http://localhost:8000';

/**
 * Fetch with automatic retry on 429 (rate limit) errors.
 * Retries up to maxRetries times with exponential backoff.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429 && attempt < maxRetries) {
      // Parse retry-after or use exponential backoff
      const errorData = await response.json().catch(() => ({}));
      const retryMatch = errorData?.error?.message?.match(/retry in ([\d.]+)s/i);
      const waitSeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 2 : (10 * Math.pow(2, attempt));
      console.warn(`Rate limited (429). Retry ${attempt + 1}/${maxRetries} in ${waitSeconds}s...`);
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }

    return response;
  }
  // Should not reach here, but just in case
  return fetch(url, options);
}

/**
 * Call AI — tries backend first (local dev), falls back to direct Gemini API.
 * On deployed environments (Vercel), skips backend entirely.
 */
export const callDeepSeekAPI = async (
  messages: DeepSeekMessage[],
  jsonMode: boolean = false
): Promise<string> => {
  // On Vercel or other deployed environments, call Gemini directly
  if (isDeployed) {
    return callGeminiDirect(messages, jsonMode);
  }

  // On localhost, try backend first, then fall back to direct Gemini
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        json_mode: jsonMode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `服务器错误: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error: any) {
    console.warn('Backend unavailable, calling Gemini directly:', error.message);
    return callGeminiDirect(messages, jsonMode);
  }
};

/**
 * Call Gemini REST API directly from the browser.
 * No backend needed — works on Vercel.
 */
async function callGeminiDirect(
  messages: DeepSeekMessage[],
  jsonMode: boolean = false
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return '⚠️ AI 功能暂不可用：未配置 VITE_GEMINI_API_KEY 环境变量。请在 Vercel 设置中添加此变量后重新部署。';
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Build Gemini API request body
  const contents: any[] = [];
  let systemInstruction: string | undefined;

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
    } else {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  // Ensure the first content is from 'user' (Gemini requirement)
  if (contents.length === 0 || contents[0].role !== 'user') {
    contents.unshift({
      role: 'user',
      parts: [{ text: '你好' }],
    });
  }

  const requestBody: any = { contents };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (jsonMode) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
    };
  }

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini API 错误: ${errorMsg}`);
  }

  const data = await response.json();

  try {
    return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error('Unexpected Gemini response:', data);
    throw new Error('Gemini 返回了意外的响应格式');
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
 * 使用 Gemini Vision API 直接分析上传的图片。
 * 无论图片是否为标准脑影像，都会生成一份丰富的分析报告。
 * 将 base64 图片发送给 Gemini，返回结构化 JSON 报告。
 */
export const analyzeImageWithGeminiVision = async (
  imageBase64: string,
  mimeType: string,
  geneFileText?: string
): Promise<any> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY 未配置');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const systemPrompt = `你是 NeuroGen Core —— 一个专业的神经影像 AI 分析系统。
请分析用户上传的图像和/或数据，生成一份完整的医学分析报告。

重要规则：
1. 如果图像是标准脑部影像（MRI、fMRI、CT、PET等），请根据实际影像内容进行专业分析。
2. 如果图像不是标准脑部影像（如普通照片、截图、其他医学图像），请基于神经科学知识生成一份合理的演示分析报告，作为系统功能展示。不要拒绝分析，不要说"无法分析"。
3. 如果提供了基因/细胞数据，请将其纳入分析。如果数据格式不标准，请基于神经科学知识生成合理的关联分析。
4. 无论输入是什么，你都必须返回完整的 JSON 报告。

你必须严格返回以下 JSON 格式（不要包含任何其他文本、markdown 或解释）：
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
}

注意事项：
- regions 数组必须包含 5 个脑区
- diseaseRisks 必须包含 5 种疾病风险评估
- gwasAnalysis 必须包含 5 种细胞类型
- probability 和 score 必须是数字，不是字符串
- color 使用 hex 颜色：红色系 #ef4444 (高风险)，橙色 #f97316，黄色 #f59e0b，绿色 #10b981/#34d399 (低风险)
- level 只能是 "High Risk"、"Moderate" 或 "Low"
- lifecycleProjection 必须有 10 年数据（2025-2034），riskLevel 范围 0-100
- detailedFindings 第一段用【影像学发现 (fMRI)】开头，第二段用【单细胞/基因发现 (scRNA)】开头
- 请生成丰富、专业、有深度的内容`;

  const userParts: any[] = [
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    },
    {
      text: geneFileText
        ? `请分析这张影像并结合以下基因/细胞数据，生成完整的神经科学多模态诊断报告：\n${geneFileText.substring(0, 3000)}`
        : '请分析这张影像并生成完整的神经科学多模态诊断报告。',
    },
  ];

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: userParts,
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
    },
  };

  // 60-second timeout for image analysis (it's heavier)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`Gemini API 错误: ${errorMsg}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Parse the JSON response
    return JSON.parse(text);
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('分析超时，请重试');
    }
    throw err;
  }
};