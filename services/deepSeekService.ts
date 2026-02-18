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
 * 专门用于生成医学报告的函数
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