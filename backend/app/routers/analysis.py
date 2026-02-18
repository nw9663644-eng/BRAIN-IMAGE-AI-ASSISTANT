"""AI Analysis router: Multimodal analysis and AI chat endpoints."""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
from pydantic import BaseModel
from app.services.ai_service import analyze_multimodal, chat_with_ai
from app.services.auth_service import get_current_user
from app.database import get_supabase
from app.models import AnalysisResultResponse

router = APIRouter(prefix="/api/analysis", tags=["AI Analysis"])


# ─── Multimodal Image Analysis ────────────────────────────

@router.post("/multimodal")
async def run_multimodal_analysis(
    image_file: UploadFile = File(...),
    gene_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Run AI multimodal analysis on uploaded medical images (+ optional gene data).
    Returns a full AI analysis report (JSON).
    """
    try:
        img_contents = await image_file.read()
        gene_contents = None
        gene_filename = None

        if gene_file:
            gene_contents = await gene_file.read()
            gene_filename = gene_file.filename

        result = await analyze_multimodal(
            image_contents=img_contents,
            image_filename=image_file.filename,
            gene_contents=gene_contents,
            gene_filename=gene_filename,
        )

        # Optionally save to database
        db = get_supabase()
        db.table("analysis_results").insert({
            "user_id": current_user["id"],
            "result_json": result,
        }).execute()

        return result

    except Exception as e:
        print(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── AI Chat (General Medical Assistant) ──────────────────

class ChatRequest(BaseModel):
    messages: list[dict]  # [{role: "user" | "system" | "assistant", content: "..."}]
    json_mode: bool = False


@router.post("/chat")
async def ai_chat(
    req: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Chat with the AI medical assistant (DeepSeek).
    Accepts a list of messages and returns the AI response.
    """
    try:
        response = await chat_with_ai(req.messages, req.json_mode)
        return {"content": response}
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Mock Analysis Result (for Health Report) ────────────

@router.get("/health-report/{user_id}", response_model=AnalysisResultResponse)
async def get_health_report(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a deterministic health report based on user ID.
    This mirrors the frontend utils/mockData.ts generateAnalysisResult logic.
    """
    # Same hash logic as frontend
    hash_val = 0
    for char in user_id:
        hash_val = ((hash_val << 5) - hash_val) + ord(char)
        hash_val = hash_val & 0xFFFFFFFF  # Convert to 32-bit integer (unsigned)

    seed = abs(hash_val)

    regions = [
        "海马体 CA1",
        "杏仁核 (BLA)",
        "前额叶皮层 (PFC)",
        "丘脑网状核",
        "纹状体",
        "黑质 (SNpc)",
    ]
    diagnoses = [
        "建议进行进一步的 fMRI 扫描以排除焦虑症风险。",
        "遗传风险评分较低，建议保持健康睡眠习惯。",
        "检测到海马体功能连接减弱，建议关注记忆力变化以排查早期 AD。",
        "神经回路连接正常，处于健康范围。",
        "多巴胺能通路活跃度异常，建议排查帕金森病风险。",
        "脑白质高信号提示轻度脑小血管病变，建议控制血压。",
    ]

    return AnalysisResultResponse(
        riskScore=(seed % 60) + 20,
        dominantRegion=regions[seed % len(regions)],
        diagnosisSuggestion=diagnoses[seed % len(diagnoses)],
        geneCount=(seed % 500) + 100,
    )
