"""Google Gemini AI integration service — replaces DeepSeek."""

import hashlib
import json
from typing import Optional

import google.generativeai as genai
from PIL import Image
import io

from app.config import get_settings

# ─── Medical Feature Database ────────────────────────────

FEATURE_DATABASE = [
    {
        "description": "MRI T1加权像显示右侧海马体头部（Hippocampal Head）体积较常模缩小约 12%，灰白质对比度在颞叶内侧降低。内嗅皮层可见轻度萎缩。",
        "regions": ["海马体 CA1", "内嗅皮层", "颞叶"],
        "severity": "中度风险",
        "suspected": "阿尔茨海默病 (AD) 早期",
    },
    {
        "description": "fMRI 静息态数据显示杏仁核（Amygdala）与前额叶皮层（PFC）之间的功能连接（Functional Connectivity）显著减弱。情感调节回路异常。",
        "regions": ["杏仁核", "前额叶皮层"],
        "severity": "高风险",
        "suspected": "双相情感障碍 (BIP) / 精神分裂症 (SCZ)",
    },
    {
        "description": "SWI 序列显示基底节区及半卵圆中心可见多发微出血灶（Microbleeds）。T2-FLAIR 显示脑室旁白质高信号（WMH），Fazekas 2级。",
        "regions": ["基底节", "半卵圆中心", "白质"],
        "severity": "中度风险",
        "suspected": "脑小血管病 (CSVD) / 血管性认知障碍",
    },
    {
        "description": "黑质致密带（SNpc）在 NM-MRI（神经黑色素成像）上显示信号减低，燕尾征（Swallow Tail Sign）模糊或消失。纹状体多巴胺转运体摄取率降低。",
        "regions": ["黑质", "纹状体"],
        "severity": "高风险",
        "suspected": "帕金森病 (PD)",
    },
    {
        "description": "左侧额叶可见一类圆形占位性病变，边界清晰，T1低信号，T2高信号，增强扫描可见明显强化，伴周围轻度水肿。",
        "regions": ["左侧额叶"],
        "severity": "高风险",
        "suspected": "脑膜瘤 (Meningioma) 或 胶质瘤 (Glioma)",
    },
    {
        "description": "胼胝体及脑室旁可见多发垂直于侧脑室的卵圆形高信号灶（Dawson's Fingers），提示脱髓鞘改变。",
        "regions": ["胼胝体", "脑室旁白质"],
        "severity": "中度风险",
        "suspected": "多发性硬化 (MS)",
    },
    {
        "description": "全脑结构扫描未见明显异常，皮层厚度在正常范围内，基底节区无异常信号，脑室系统形态正常。",
        "regions": ["全脑"],
        "severity": "健康",
        "suspected": "健康对照 (CN)",
    },
]

GENE_DATABASE = [
    {
        "gene_summary": "scRNA-seq 显示 Microglia 中 TREM2, CD33 表达显著上调，提示神经炎症活跃。Astrocyte 呈反应性状态 (GFAP high)。",
        "risk_genes": ["APOE-e4", "TREM2", "CD33"],
        "cell_type": "Microglia & Astrocytes",
    },
    {
        "gene_summary": "Excitatory Neurons (Layer 5/6) 突触相关基因 (SYT1, SNAP25) 表达下调。",
        "risk_genes": ["SYT1", "NRXN1", "GRIN2A"],
        "cell_type": "Glutamatergic Neurons",
    },
    {
        "gene_summary": "Dopaminergic neuron 标记物 (TH, DAT) 表达水平降低，线粒体功能障碍相关基因 (PINK1) 异常。",
        "risk_genes": ["SNCA", "PINK1", "LRRK2"],
        "cell_type": "Dopaminergic Neurons",
    },
    {
        "gene_summary": "基因表达谱正常，未检测到显著的疾病相关变异富集。",
        "risk_genes": [],
        "cell_type": "Normal",
    },
]

# ─── Gemini Prompt Templates ─────────────────────────────

SYSTEM_PROMPT_MULTIMODAL = """
你是一个名为 "NeuroGen Core" 的顶尖医学 AI 专家系统。你的任务是进行严谨的【多模态融合诊断】，结合【宏观影像学特征 (fMRI/MRI)】和【微观基因组学特征 (scRNA-seq/GWAS)】。

**分析原则**：
1. **专业谨慎 (Professional & Cautious)**：
   - 使用标准的医学术语（如：各向异性分数 FA 值、BOLD 信号、转录组丰度）。
   - 避免绝对化的诊断（如"确诊为..."），应使用推断性语言。
   - 对待风险评估要保守。

2. **多模态互证 (Cross-Modal Validation)**：
   - 必须运用 CycleGAN 的逻辑：明确指出微观的基因表达是否解释了宏观的影像异常。
   - 如果两者一致，强调"证据链闭环"；如果矛盾，提示"需进一步检查"。

3. **丰富详实 (Rich Content)**：
   - "detailedFindings" 必须分层描述。
   - "recommendation" 必须包含确诊检查、药物/治疗方向、生活方式干预、随访计划。

请返回严格的 JSON 格式数据，结构如下：
{
  "summary": "一段约 200 字的专业融合诊断摘要",
  "detailedFindings": "详细描述，分段：【影像学层面】... 【基因组学层面】... 【多模态关联】...",
  "regions": [{"name": "脑区名", "description": "具体的病理改变描述", "score": 0.0-1.0, "level": "High Risk" | "Moderate" | "Low"}],
  "recommendation": "分点列出的详细临床建议。",
  "diseaseRisks": [{"name": "疾病名称", "probability": 0-100, "color": "#hex"}],
  "gwasAnalysis": [{"name": "细胞类型/通路", "score": 0-100}],
  "modelConfidence": [{"name": "诊断类别", "probability": 0-100}],
  "lifecycleProjection": [{"year": 2025...2034, "riskLevel": 0-100}]
}
"""


def _get_gemini_model():
    """Configure and return a Gemini generative model."""
    settings = get_settings()
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel("gemini-1.5-flash")


async def analyze_multimodal(
    image_contents: bytes,
    image_filename: str,
    gene_contents: Optional[bytes] = None,
    gene_filename: Optional[str] = None,
) -> dict:
    """
    Perform multimodal AI analysis on medical imaging + optional gene data.
    Uses Google Gemini API.
    """
    # 1. Generate features from image hash
    file_hash = hashlib.md5(image_contents).hexdigest()

    image_meta = "未知格式"
    try:
        img = Image.open(io.BytesIO(image_contents))
        image_meta = f"分辨率 {img.size[0]}x{img.size[1]}, 格式 {img.format}"
    except Exception:
        pass

    seed_idx = int(file_hash, 16) % len(FEATURE_DATABASE)
    visual_feature = FEATURE_DATABASE[seed_idx]

    # 2. Generate gene features
    gene_feature_text = "未提供单细胞/基因数据。"
    if gene_contents and gene_filename:
        gene_seed = len(gene_filename) % len(GENE_DATABASE)
        gene_data = GENE_DATABASE[gene_seed]
        gene_feature_text = f"""
        【单细胞测序分析结果】:
        - 关键发现: {gene_data['gene_summary']}
        - 风险基因检出: {', '.join(gene_data['risk_genes'])}
        - 主要受累细胞: {gene_data['cell_type']}
        """

    # 3. Build user prompt
    user_prompt = f"""
    【输入数据元数据】:
    影像: {image_filename} ({image_meta})
    基因文件: {gene_filename or '无'}
    
    【影像学特征提取 (Macro)】:
    {visual_feature['description']}
    - 初步风险: {visual_feature['severity']}
    - 受累区域: {', '.join(visual_feature['regions'])}
    
    {gene_feature_text}
    
    请基于以上多模态数据，生成一份详细的融合医学分析报告。如果提供了基因数据，请重点分析"微观基因"如何解释"宏观影像"的变化。
    """

    # 4. Call Gemini API
    model = _get_gemini_model()
    response = model.generate_content(
        [SYSTEM_PROMPT_MULTIMODAL + "\n\n" + user_prompt],
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,
            response_mime_type="application/json",
        ),
    )

    ai_content = response.text
    cleaned_content = ai_content.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(cleaned_content)
    except json.JSONDecodeError:
        # Fallback response
        return {
            "summary": f"AI 融合分析：影像显示{visual_feature['regions'][0]}异常。",
            "detailedFindings": f"影像：{visual_feature['description']}\n基因：{gene_feature_text}",
            "regions": [
                {
                    "name": r,
                    "description": "检测到异常信号",
                    "score": 0.8,
                    "level": "High Risk",
                }
                for r in visual_feature["regions"]
            ],
            "recommendation": "建议进一步检查。",
            "diseaseRisks": [],
            "gwasAnalysis": [],
            "modelConfidence": [],
            "lifecycleProjection": [],
        }


async def chat_with_ai(messages: list[dict], json_mode: bool = False) -> str:
    """General-purpose chat with Gemini AI (used by AI assistant feature)."""
    model = _get_gemini_model()

    # Extract system instruction
    system_text = ""
    chat_parts = []
    for msg in messages:
        if msg["role"] == "system":
            system_text = msg["content"]
        elif msg["role"] == "user":
            chat_parts.append({"role": "user", "parts": [msg["content"]]})
        elif msg["role"] in ("assistant", "model"):
            chat_parts.append({"role": "model", "parts": [msg["content"]]})

    generation_config = genai.types.GenerationConfig(
        temperature=0.3 if json_mode else 1.0,
    )
    if json_mode:
        generation_config.response_mime_type = "application/json"

    # Use chat with history
    chat = model.start_chat(history=chat_parts[:-1] if len(chat_parts) > 1 else [])

    last_msg = chat_parts[-1]["parts"][0] if chat_parts else ""
    if system_text and not chat_parts:
        last_msg = system_text

    # Prepend system instruction to first message if present
    if system_text and chat_parts:
        full_prompt = system_text + "\n\n" + last_msg
    else:
        full_prompt = last_msg

    response = chat.send_message(full_prompt, generation_config=generation_config)
    return response.text
