import { SYSTEM_INSTRUCTION } from '../constants';

// Backend URL — the backend handles Gemini API calls server-side
const BACKEND_URL = 'http://localhost:8000';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Call AI via the backend /chat endpoint.
 * The backend handles Gemini API calls server-side, avoiding CORS and API key issues.
 */
export const callDeepSeekAPI = async (messages: DeepSeekMessage[], jsonMode: boolean = false): Promise<string> => {
  try {
    const response = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        json_mode: jsonMode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(errorData.detail || `服务器错误: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error: any) {
    // If backend is unreachable, try local fallback
    if (error.message === 'Failed to fetch' || error.message?.includes('NetworkError')) {
      console.warn('Backend unreachable, using local fallback');
      return generateFallbackResponse(messages);
    }
    throw error;
  }
};

/**
 * Fallback when backend is unavailable.
 */
function generateFallbackResponse(messages: DeepSeekMessage[]): string {
  const lastMsg = messages[messages.length - 1]?.content || '';

  const knowledgeBase: Record<string, string> = {
    '阿尔茨海默': `阿尔茨海默病（Alzheimer's Disease, AD）是最常见的神经退行性疾病，占痴呆病例的 60-80%。

**核心病理特征：**
1. **淀粉样蛋白假说**：β-淀粉样蛋白（Aβ42）异常聚集，形成老年斑
2. **Tau蛋白病理**：过度磷酸化Tau蛋白形成神经原纤维缠结
3. **神经炎症**：小胶质细胞异常激活，TREM2、CD33基因表达上调

**影像学表现：** MRI海马体萎缩、内嗅皮层变薄；PET显示颞顶叶低代谢

⚠️ 以上为AI辅助参考信息，不构成临床诊断依据。`,

    '帕金森': `帕金森病（Parkinson's Disease, PD）是第二常见的神经退行性疾病。

**核心病理：** 黑质致密带多巴胺能神经元进行性丢失，α-突触核蛋白异常聚集形成路易体。

**四主征：** 静止性震颤、肌强直、运动迟缓、姿势不稳

⚠️ 以上为AI辅助参考信息，不构成临床诊断依据。`,
  };

  for (const [keyword, response] of Object.entries(knowledgeBase)) {
    if (lastMsg.includes(keyword)) return response;
  }

  return `感谢您的提问。AI 服务暂时不可用，请确保后端服务正在运行（uvicorn main:app --reload --port 8000）。

⚠️ 以上为AI辅助参考信息，不构成临床诊断依据。`;
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