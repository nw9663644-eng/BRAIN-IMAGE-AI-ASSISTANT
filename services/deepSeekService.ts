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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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

  const response = await fetch(url, {
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
 * 使用 Gemini Vision API 直接分析上传的脑影像图片。
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const systemPrompt = `你是 NeuroGen Core —— 一个专业的神经影像 AI 分析系统。
请仔细分析用户上传的脑部影像（可能是 MRI、fMRI、CT 等），给出专业的医学分析报告。

你必须严格返回以下 JSON 格式（不要包含任何其他文本、markdown 或解释）：
{
  "summary": "200字左右的综合诊断总结，包含主要发现和初步诊断倾向",
  "detailedFindings": "详细的影像学发现描述，分为【影像学层面】和【多模态关联】两段，用换行分隔",
  "regions": [
    {"name": "脑区中文名 (英文名)", "description": "该区域的异常描述", "score": 0.85, "level": "High Risk"},
    {"name": "脑区名", "description": "描述", "score": 0.5, "level": "Moderate"},
    {"name": "脑区名", "description": "描述", "score": 0.2, "level": "Low"}
  ],
  "recommendation": "分条列出的临床建议（用 1. 2. 3. 编号）",
  "diseaseRisks": [
    {"name": "疾病名称", "probability": 75, "color": "#ef4444"},
    {"name": "疾病名称", "probability": 40, "color": "#f59e0b"},
    {"name": "疾病名称", "probability": 10, "color": "#10b981"}
  ],
  "gwasAnalysis": [
    {"name": "细胞类型", "score": 90, "pValue": "P < 0.001"},
    {"name": "细胞类型", "score": 60, "pValue": "P < 0.05"}
  ],
  "modelConfidence": [
    {"name": "最可能诊断", "probability": 70},
    {"name": "次可能诊断", "probability": 20},
    {"name": "Other", "probability": 10}
  ],
  "lifecycleProjection": [
    {"year": 2025, "riskLevel": 50},
    {"year": 2026, "riskLevel": 55},
    {"year": 2027, "riskLevel": 62},
    {"year": 2028, "riskLevel": 70},
    {"year": 2029, "riskLevel": 78},
    {"year": 2030, "riskLevel": 84},
    {"year": 2031, "riskLevel": 88},
    {"year": 2032, "riskLevel": 91},
    {"year": 2033, "riskLevel": 93},
    {"year": 2034, "riskLevel": 95}
  ]
}

注意事项：
- regions 数组必须包含至少 3 个脑区，最多 6 个
- diseaseRisks 至少包含 3 种疾病风险评估
- probability 和 score 必须是数字，不是字符串
- color 使用 hex 颜色：红色系 #ef4444 (高风险)，橙色 #f97316，黄色 #f59e0b，绿色 #10b981/#34d399 (低风险)
- level 只能是 "High Risk"、"Moderate" 或 "Low"
- lifecycleProjection 必须有 10 年数据（2025-2034），riskLevel 范围 0-100
- 请根据影像的实际内容进行分析，给出合理的医学判断`;

  const userParts: any[] = [
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    },
    {
      text: geneFileText
        ? `请分析这张脑部影像。附加的基因数据信息如下：\n${geneFileText}`
        : '请分析这张脑部影像并生成完整的诊断报告。',
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
    const response = await fetch(url, {
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
      throw new Error('分析超时（60秒），请重试');
    }
    throw err;
  }
};