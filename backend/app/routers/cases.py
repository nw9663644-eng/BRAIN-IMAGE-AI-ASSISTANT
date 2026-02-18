"""Medical Cases router: CRUD for cases, chat messages, and doctor diagnosis."""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from typing import Optional
from app.models import (
    MedicalCaseResponse,
    CaseMessageResponse,
    CaseMessageCreate,
    DoctorDiagnosisRequest,
    UserRole,
)
from app.database import get_supabase
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/cases", tags=["Medical Cases"])


# ─── Helpers ──────────────────────────────────────────────

def _build_case_response(case: dict, messages: list[dict] = None) -> MedicalCaseResponse:
    """Convert a database case row + messages to the API response model."""
    msg_list = []
    if messages:
        msg_list = [
            CaseMessageResponse(
                id=m["id"],
                senderId=m["sender_id"],
                senderName=m["sender_name"],
                senderRole=m["sender_role"],
                text=m["text"],
                timestamp=m["timestamp"],
            )
            for m in messages
        ]

    return MedicalCaseResponse(
        id=case["id"],
        patientId=case["patient_id"],
        patientName=case["patient_name"],
        imageUrl=case.get("image_url"),
        description=case["description"],
        timestamp=case["created_at"],
        status=case["status"],
        doctorFeedback=case.get("doctor_feedback"),
        doctorName=case.get("doctor_name"),
        replyTimestamp=case.get("reply_timestamp"),
        messages=msg_list,
        hasUnreadForDoctor=case.get("has_unread_for_doctor", False),
        hasUnreadForPatient=case.get("has_unread_for_patient", False),
        modality=case.get("modality"),
        tags=case.get("tags"),
    )


# ─── Endpoints ────────────────────────────────────────────

@router.get("", response_model=list[MedicalCaseResponse])
async def list_cases(current_user: dict = Depends(get_current_user)):
    """
    List medical cases.
    - Patients see only their own cases.
    - Doctors see all cases.
    """
    db = get_supabase()

    if current_user["role"] == UserRole.PATIENT.value:
        cases_result = (
            db.table("medical_cases")
            .select("*")
            .eq("patient_id", current_user["id"])
            .order("created_at", desc=True)
            .execute()
        )
    else:
        cases_result = (
            db.table("medical_cases")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

    cases = cases_result.data or []
    response = []

    for case in cases:
        # Fetch messages for each case
        msgs_result = (
            db.table("case_messages")
            .select("*")
            .eq("case_id", case["id"])
            .order("created_at", desc=False)
            .execute()
        )
        response.append(_build_case_response(case, msgs_result.data or []))

    return response


@router.get("/{case_id}", response_model=MedicalCaseResponse)
async def get_case(case_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single case by ID with its messages."""
    db = get_supabase()

    case_result = db.table("medical_cases").select("*").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(status_code=404, detail="病例不存在")

    case = case_result.data[0]

    # Access control: patients can only view their own cases
    if (
        current_user["role"] == UserRole.PATIENT.value
        and case["patient_id"] != current_user["id"]
    ):
        raise HTTPException(status_code=403, detail="无权访问此病例")

    msgs_result = (
        db.table("case_messages")
        .select("*")
        .eq("case_id", case_id)
        .order("created_at", desc=False)
        .execute()
    )

    # Mark as read for current user's role
    if current_user["role"] == UserRole.DOCTOR.value and case.get("has_unread_for_doctor"):
        db.table("medical_cases").update({"has_unread_for_doctor": False}).eq("id", case_id).execute()
    elif current_user["role"] == UserRole.PATIENT.value and case.get("has_unread_for_patient"):
        db.table("medical_cases").update({"has_unread_for_patient": False}).eq("id", case_id).execute()

    return _build_case_response(case, msgs_result.data or [])


@router.post("", response_model=MedicalCaseResponse, status_code=201)
async def create_case(
    description: str = Form(...),
    modality: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),         # Comma-separated tags
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    """Create a new medical case (patient only)."""
    if current_user["role"] != UserRole.PATIENT.value:
        raise HTTPException(status_code=403, detail="只有患者可以创建病例")

    db = get_supabase()
    case_id = str(__import__("time").time_ns())

    # Upload image to Supabase Storage if provided
    image_url = None
    if image:
        try:
            img_bytes = await image.read()
            file_path = f"case-images/{case_id}/{image.filename}"
            db.storage.from_("medical-images").upload(file_path, img_bytes)
            image_url = db.storage.from_("medical-images").get_public_url(file_path)
        except Exception as e:
            print(f"Image upload failed: {e}")
            # Continue without image URL

    # Parse tags
    tag_list = [t.strip() for t in tags.split(",")] if tags else None

    case_data = {
        "id": case_id,
        "patient_id": current_user["id"],
        "patient_name": current_user["name"],
        "image_url": image_url,
        "description": description,
        "status": "pending",
        "modality": modality if modality else None,
        "tags": tag_list,
        "has_unread_for_doctor": True,
        "has_unread_for_patient": False,
    }

    result = db.table("medical_cases").insert(case_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="创建病例失败")

    return _build_case_response(result.data[0], [])


@router.post("/{case_id}/messages", response_model=CaseMessageResponse, status_code=201)
async def send_message(
    case_id: str,
    msg: CaseMessageCreate,
    current_user: dict = Depends(get_current_user),
):
    """Send a chat message within a case."""
    db = get_supabase()

    # Verify case exists
    case_result = db.table("medical_cases").select("*").eq("id", case_id).execute()
    if not case_result.data:
        raise HTTPException(status_code=404, detail="病例不存在")

    from datetime import datetime

    now = datetime.now()
    time_str = now.strftime("%H:%M")
    msg_id = str(__import__("time").time_ns())

    message_data = {
        "id": msg_id,
        "case_id": case_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "sender_role": current_user["role"],
        "text": msg.text,
        "timestamp": time_str,
    }

    result = db.table("case_messages").insert(message_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="发送消息失败")

    # Update unread flags on the case
    is_patient = current_user["role"] == UserRole.PATIENT.value
    db.table("medical_cases").update({
        "has_unread_for_doctor": is_patient,
        "has_unread_for_patient": not is_patient,
    }).eq("id", case_id).execute()

    m = result.data[0]
    return CaseMessageResponse(
        id=m["id"],
        senderId=m["sender_id"],
        senderName=m["sender_name"],
        senderRole=m["sender_role"],
        text=m["text"],
        timestamp=m["timestamp"],
    )


@router.post("/{case_id}/diagnosis", response_model=MedicalCaseResponse)
async def submit_diagnosis(
    case_id: str,
    req: DoctorDiagnosisRequest,
    current_user: dict = Depends(get_current_user),
):
    """Submit an official doctor diagnosis for a case."""
    if current_user["role"] != UserRole.DOCTOR.value:
        raise HTTPException(status_code=403, detail="只有医生可以提交诊断")

    db = get_supabase()

    from datetime import datetime

    now = datetime.now()
    time_str = now.strftime("%Y/%m/%d %H:%M")

    update_data = {
        "status": "completed",
        "doctor_feedback": req.feedback,
        "doctor_name": current_user["name"],
        "reply_timestamp": time_str,
        "has_unread_for_patient": True,
    }

    result = (
        db.table("medical_cases")
        .update(update_data)
        .eq("id", case_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="病例不存在")

    # Get messages
    msgs_result = (
        db.table("case_messages")
        .select("*")
        .eq("case_id", case_id)
        .order("created_at", desc=False)
        .execute()
    )

    return _build_case_response(result.data[0], msgs_result.data or [])


@router.patch("/{case_id}/read")
async def mark_as_read(
    case_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a case as read for the current user's role."""
    db = get_supabase()

    if current_user["role"] == UserRole.DOCTOR.value:
        db.table("medical_cases").update({"has_unread_for_doctor": False}).eq("id", case_id).execute()
    else:
        db.table("medical_cases").update({"has_unread_for_patient": False}).eq("id", case_id).execute()

    return {"status": "ok"}
