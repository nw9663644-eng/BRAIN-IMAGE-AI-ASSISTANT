"""Pydantic models (schemas) matching the frontend TypeScript types."""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from enum import Enum


# ─── Enums ────────────────────────────────────────────────

class UserRole(str, Enum):
    DOCTOR = "DOCTOR"
    PATIENT = "PATIENT"


class Gender(str, Enum):
    MALE = "男"
    FEMALE = "女"


class CaseStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class Modality(str, Enum):
    CT = "CT"
    MRI = "MRI"
    XRAY = "X-Ray"
    ULTRASOUND = "Ultrasound"
    OTHER = "Other"


# ─── Auth Schemas ─────────────────────────────────────────

class RegisterRequest(BaseModel):
    id: str = Field(..., description="身份证号 (18位) or 工号 (10位)")
    password: str = Field(..., min_length=8)
    role: UserRole
    name: str
    gender: Gender = Gender.MALE
    age: int = Field(ge=0, le=120)
    phone: str = Field(..., pattern=r"^\d{11}$")
    department: Optional[str] = None
    title: Optional[str] = None
    hospital: Optional[str] = None
    specialties: Optional[str] = None


class LoginRequest(BaseModel):
    id: str
    password: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserProfileResponse"


# ─── User Profile ─────────────────────────────────────────

class UserProfileResponse(BaseModel):
    id: str
    role: UserRole
    name: str
    gender: Optional[Gender] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    hospital: Optional[str] = None
    specialties: Optional[str] = None
    registrationDate: str


# ─── Case Schemas ─────────────────────────────────────────

class CaseMessageResponse(BaseModel):
    id: str
    senderId: str
    senderName: str
    senderRole: UserRole
    text: str
    timestamp: str


class CaseMessageCreate(BaseModel):
    text: str


class MedicalCaseResponse(BaseModel):
    id: str
    patientId: str
    patientName: str
    imageUrl: Optional[str] = None
    description: str
    timestamp: str
    status: CaseStatus
    doctorFeedback: Optional[str] = None
    doctorName: Optional[str] = None
    replyTimestamp: Optional[str] = None
    messages: list[CaseMessageResponse] = []
    hasUnreadForDoctor: bool = False
    hasUnreadForPatient: bool = False
    modality: Optional[Modality] = None
    tags: Optional[list[str]] = None


class DoctorDiagnosisRequest(BaseModel):
    feedback: str


# ─── AI Analysis Schemas ──────────────────────────────────

class AIRegionRisk(BaseModel):
    name: str
    description: str
    score: float = Field(ge=0, le=1)
    level: Literal["Low", "Moderate", "High Risk"]


class AIAnalysisReport(BaseModel):
    summary: str
    detailedFindings: str
    regions: list[AIRegionRisk] = []
    recommendation: str
    diseaseRisks: list[dict] = []
    gwasAnalysis: list[dict] = []
    modelConfidence: list[dict] = []
    lifecycleProjection: list[dict] = []


class AnalysisResultResponse(BaseModel):
    riskScore: int
    dominantRegion: str
    diagnosisSuggestion: str
    geneCount: int


# Rebuild forward references
TokenResponse.model_rebuild()
