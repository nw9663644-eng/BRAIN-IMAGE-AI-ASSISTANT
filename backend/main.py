"""
NeuroGen AI Backend — Multimodal Analysis + Chat Server
Uses Gemini API via direct REST calls (httpx)

Run with:
    cd backend
    pip install fastapi uvicorn httpx pillow python-multipart
    uvicorn main:app --reload --port 8000
"""

import hashlib
import json
import os
import traceback
from dotenv import load_dotenv
load_dotenv()  # Load .env file
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from PIL import Image
import io

# ─── App Setup ────────────────────────────────────────────

app = FastAPI(title="NeuroGen AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Gemini API Configuration ────────────────────────────

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if not GEMINI_API_KEY:
    print("⚠️  WARNING: GEMINI_API_KEY not set. AI features will not work.")
    print("   Set it via: export GEMINI_API_KEY=your_key_here")

# Direct REST endpoint — no SDK needed
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"


async def call_gemini(messages: list[dict], json_mode: bool = False) -> str:
    """Call Gemini via direct REST API — avoids SDK version issues."""
    
    # Build the request body
    contents = []
    system_instruction = None
    
    for msg in messages:
        if msg["role"] == "system":
            system_instruction = msg["content"]
        elif msg["role"] in ("user", "model"):
            contents.append({
                "role": msg["role"],
                "parts": [{"text": msg["content"]}]
            })
        elif msg["role"] == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": msg["content"]}]
            })
    
    body = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.3 if json_mode else 1.0,
        }
    }
    
    if system_instruction:
        body["systemInstruction"] = {
            "parts": [{"text": system_instruction}]
        }
    
    if json_mode:
        body["generationConfig"]["responseMimeType"] = "application/json"
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(GEMINI_API_URL, json=body)
        
        if response.status_code != 200:
            error_detail = response.text
            print(f"Gemini API Error {response.status_code}: {error_detail}")
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Gemini API Error: {error_detail}"
            )
        
        data = response.json()
        
        # Extract text from response
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return text
        except (KeyError, IndexError) as e:
            print(f"Unexpected Gemini response structure: {json.dumps(data, indent=2)}")
            raise HTTPException(status_code=500, detail=f"Unexpected response: {str(e)}")


# ─── Medical Feature Database ────────────────────────────

FEATURE_DATABASE = [
    {
        "description": "MRI T1加权像显示右侧海马体头部（Hippocampal Head）体积较常模缩小约 12%，灰白质对比度在颞叶内侧降低。内嗅皮层可见轻度萎缩。",
        "regions": ["海马体 CA1", "内嗅皮层", "颞叶"],
        "severity": "中度风险",
        "suspected": "阿尔茨海默病 (AD) 早期"
    },
    {
        "description": "fMRI 静息态数据显示杏仁核（Amygdala）与前额叶皮层（PFC）之间的功能连接（Functional Connectivity）显著减弱。情感调节回路异常。",
        "regions": ["杏仁核", "前额叶皮层"],
        "severity": "高风险",
        "suspected": "双相情感障碍 (BIP) / 精神分裂症 (SCZ)"
    },
    {
        "description": "SWI 序列显示基底节区及半卵圆中心可见多发微出血灶（Microbleeds）。T2-FLAIR 显示脑室旁白质高信号（WMH），Fazekas 2级。",
        "regions": ["基底节", "半卵圆中心", "白质"],
        "severity": "中度风险",
        "suspected": "脑小血管病 (CSVD) / 血管性认知障碍"
    },
    {
        "description": "黑质致密带（SNpc）在 NM-MRI（神经黑色素成像）上显示信号减低，燕尾征（Swallow Tail Sign）模糊或消失。纹状体多巴胺转运体摄取率降低。",
        "regions": ["黑质", "纹状体"],
        "severity": "高风险",
        "suspected": "帕金森病 (PD)"
    },
    {
        "description": "左侧额叶可见一类圆形占位性病变，边界清晰，T1低信号，T2高信号，增强扫描可见明显强化，伴周围轻度水肿。",
        "regions": ["左侧额叶"],
        "severity": "高风险",
        "suspected": "脑膜瘤 (Meningioma) 或 胶质瘤 (Glioma)"
    },
    {
        "description": "胼胝体及脑室旁可见多发垂直于侧脑室的卵圆形高信号灶（Dawson's Fingers），提示脱髓鞘改变。",
        "regions": ["胼胝体", "脑室旁白质"],
        "severity": "中度风险",
        "suspected": "多发性硬化 (MS)"
    },
    {
        "description": "全脑结构扫描未见明显异常，皮层厚度在正常范围内，基底节区无异常信号，脑室系统形态正常。",
        "regions": ["全脑"],
        "severity": "健康",
        "suspected": "健康对照 (CN)"
    }
]

GENE_DATABASE = [
    {
        "gene_summary": "scRNA-seq 显示 Microglia 中 TREM2, CD33 表达显著上调，提示神经炎症活跃。",
        "risk_genes": ["APOE-e4", "TREM2", "CD33"],
        "cell_type": "Microglia & Astrocytes"
    },
    {
        "gene_summary": "Excitatory Neurons (Layer 5/6) 突触相关基因 (SYT1, SNAP25) 表达下调。",
        "risk_genes": ["SYT1", "NRXN1", "GRIN2A"],
        "cell_type": "Glutamatergic Neurons"
    },
    {
        "gene_summary": "Dopaminergic neuron 标记物 (TH, DAT) 表达水平降低。",
        "risk_genes": ["SNCA", "PINK1", "LRRK2"],
        "cell_type": "Dopaminergic Neurons"
    },
    {
        "gene_summary": "基因表达谱正常。",
        "risk_genes": [],
        "cell_type": "Normal"
    }
]


@app.get("/")
def read_root():
    return {"status": "NeuroGen AI Backend is Running"}


@app.post("/analyze_multimodal")
async def analyze_multimodal(
    image_file: UploadFile = File(...),
    gene_file: Optional[UploadFile] = File(None)
):
    print(f"Received Image: {image_file.filename}")
    try:
        img_contents = await image_file.read()
        file_hash = hashlib.md5(img_contents).hexdigest()

        image_meta = "未知格式"
        try:
            img = Image.open(io.BytesIO(img_contents))
            image_meta = f"分辨率 {img.size[0]}x{img.size[1]}, 格式 {img.format}"
        except Exception:
            pass

        seed_idx = int(file_hash, 16) % len(FEATURE_DATABASE)
        visual_feature = FEATURE_DATABASE[seed_idx]

        gene_feature_text = "未提供单细胞/基因数据。"
        if gene_file:
            gene_seed = len(gene_file.filename) % len(GENE_DATABASE)
            gene_data = GENE_DATABASE[gene_seed]
            gene_feature_text = f"单细胞测序: {gene_data['gene_summary']} 风险基因: {', '.join(gene_data['risk_genes'])}"

        system_prompt = """你是 NeuroGen Core 医学AI。请返回严格 JSON：
        {"summary":"诊断摘要","detailedFindings":"详细描述","regions":[{"name":"脑区","description":"描述","score":0.0-1.0,"level":"High Risk"|"Moderate"|"Low"}],"recommendation":"建议","diseaseRisks":[{"name":"疾病","probability":0-100,"color":"#hex"}],"gwasAnalysis":[{"name":"类型","score":0-100}],"modelConfidence":[{"name":"类别","probability":0-100}],"lifecycleProjection":[{"year":2025,"riskLevel":0-100}]}"""

        user_prompt = f"影像:{image_file.filename}({image_meta}) 特征:{visual_feature['description']} 风险:{visual_feature['severity']} 区域:{','.join(visual_feature['regions'])} {gene_feature_text}"

        print("Calling Gemini API for analysis...")
        ai_text = await call_gemini(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            json_mode=True
        )

        try:
            return json.loads(ai_text)
        except json.JSONDecodeError:
            return {
                "summary": f"AI分析：{visual_feature['regions'][0]}异常。",
                "detailedFindings": visual_feature["description"],
                "regions": [{"name": r, "description": "异常", "score": 0.8, "level": "High Risk"} for r in visual_feature["regions"]],
                "recommendation": "建议进一步检查。",
                "diseaseRisks": [], "gwasAnalysis": [], "modelConfidence": [], "lifecycleProjection": []
            }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ─── Chat Endpoint ───────────────────────────────────────

class ChatMessageInput(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessageInput]
    json_mode: bool = False

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Chat endpoint using Gemini via direct REST API."""
    try:
        messages = [{"role": m.role, "content": m.content} for m in request.messages]
        print(f"Chat: {len(messages)} messages, calling Gemini...")
        
        result = await call_gemini(messages, json_mode=request.json_mode)
        print(f"Chat: got response ({len(result)} chars)")
        
        return {"response": result}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat Error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ─── Auth System ──────────────────────────────────────────

import jwt
import datetime
import hashlib as _hashlib

JWT_SECRET = "neurogen-secret-key-2025"
JWT_ALGORITHM = "HS256"

# Simple in-memory user store (persists while server runs)
users_db: dict[str, dict] = {}

# Pre-seed demo accounts so user can log in immediately
users_db["110101199501011234"] = {
    "id": "110101199501011234",
    "password_hash": _hashlib.sha256("12345678".encode()).hexdigest(),
    "role": "doctor",
    "name": "张医生",
    "gender": "male",
    "age": 35,
    "phone": "13800138000",
    "department": "神经内科",
    "title": "主治医师",
    "hospital": "北京协和医院",
    "specialties": "神经退行性疾病、脑影像分析",
    "registrationDate": "2025-01-15",
}
users_db["patient_demo"] = {
    "id": "patient_demo",
    "password_hash": _hashlib.sha256("12345678".encode()).hexdigest(),
    "role": "patient",
    "name": "李患者",
    "gender": "female",
    "age": 28,
    "phone": "13900139000",
    "registrationDate": "2025-06-01",
}


def create_jwt(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token 已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效 Token")


class LoginRequest(BaseModel):
    id: str
    password: str
    role: str


class RegisterRequest(BaseModel):
    id: str
    password: str
    role: str
    name: str
    gender: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    title: Optional[str] = None
    hospital: Optional[str] = None
    specialties: Optional[str] = None


@app.post("/api/auth/login")
async def login(request: LoginRequest):
    """Login endpoint — validates credentials and returns JWT."""
    user = users_db.get(request.id)
    password_hash = _hashlib.sha256(request.password.encode()).hexdigest()

    if not user or user["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="身份证号或密码错误")

    token = create_jwt(user["id"], user.get("role", request.role))

    # Return user profile without password
    user_profile = {k: v for k, v in user.items() if k != "password_hash"}

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_profile,
    }


@app.post("/api/auth/register")
async def register(request: RegisterRequest):
    """Register endpoint — creates a new user."""
    if request.id in users_db:
        raise HTTPException(status_code=400, detail="该 ID 已被注册")

    password_hash = _hashlib.sha256(request.password.encode()).hexdigest()

    new_user = {
        "id": request.id,
        "password_hash": password_hash,
        "role": request.role,
        "name": request.name,
        "gender": request.gender,
        "age": request.age,
        "phone": request.phone,
        "department": request.department,
        "title": request.title,
        "hospital": request.hospital,
        "specialties": request.specialties,
        "registrationDate": datetime.datetime.now().strftime("%Y-%m-%d"),
    }

    users_db[request.id] = new_user

    # Return user profile without password
    return {k: v for k, v in new_user.items() if k != "password_hash"}


from fastapi import Request

@app.get("/api/auth/me")
async def get_current_user(request: Request):
    """Get current user from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未登录")

    token = auth_header.replace("Bearer ", "")
    payload = verify_jwt(token)

    user = users_db.get(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return {k: v for k, v in user.items() if k != "password_hash"}


# ─── Case Management ─────────────────────────────────────

import base64
import os
import uuid

# In-memory cases store
cases_db: dict[str, dict] = {}

# Create uploads directory for images
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Serve static files for uploaded images
from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def get_user_from_request(request: Request) -> dict:
    """Extract authenticated user from request Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "")
        try:
            payload = verify_jwt(token)
            user = users_db.get(payload["sub"])
            if user:
                return user
        except Exception:
            pass
    # Return None if not authenticated
    return None


# Pre-seed a demo case so the doctor dashboard has something
_demo_case_id = "demo-case-001"
cases_db[_demo_case_id] = {
    "id": _demo_case_id,
    "patientId": "patient_demo",
    "patientName": "李患者",
    "imageUrl": None,
    "description": "近期出现头痛、记忆力减退症状，持续两周。请医生帮忙分析。",
    "timestamp": "2025/06/15 10:30",
    "status": "pending",
    "doctorFeedback": None,
    "doctorName": None,
    "replyTimestamp": None,
    "messages": [],
    "hasUnreadForDoctor": True,
    "hasUnreadForPatient": False,
    "modality": "MRI",
    "tags": ["Brain", "Headache"],
}


class CaseMessageRequest(BaseModel):
    text: str


class DiagnosisRequest(BaseModel):
    feedback: str


@app.get("/api/cases")
async def list_cases(request: Request):
    """List all cases. Doctors see all; patients see only their own."""
    user = get_user_from_request(request)

    cases = list(cases_db.values())

    if user and user.get("role") == "patient":
        cases = [c for c in cases if c["patientId"] == user["id"]]

    # Sort by timestamp, newest first
    cases.sort(key=lambda c: c.get("timestamp", ""), reverse=True)
    return cases


@app.get("/api/cases/{case_id}")
async def get_case(case_id: str):
    """Get a single case by ID."""
    case = cases_db.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="病例不存在")
    return case


@app.post("/api/cases")
async def create_case(
    request: Request,
    description: str = Form(""),
    modality: str = Form(""),
    tags: str = Form(""),
    image: Optional[UploadFile] = File(None),
):
    """Create a new case with optional image upload."""
    user = get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    now = datetime.datetime.now()
    time_str = now.strftime("%Y/%m/%d %H:%M")

    image_url = None
    if image and image.filename:
        # Save image to uploads directory
        ext = os.path.splitext(image.filename)[1] or ".png"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)

        contents = await image.read()
        with open(filepath, "wb") as f:
            f.write(contents)

        # URL accessible via static file serving
        image_url = f"http://localhost:8000/uploads/{filename}"

    case_id = str(uuid.uuid4())[:8]
    new_case = {
        "id": case_id,
        "patientId": user["id"],
        "patientName": user.get("name", "未知"),
        "imageUrl": image_url,
        "description": description,
        "timestamp": time_str,
        "status": "pending",
        "doctorFeedback": None,
        "doctorName": None,
        "replyTimestamp": None,
        "messages": [],
        "hasUnreadForDoctor": True,
        "hasUnreadForPatient": False,
        "modality": modality or None,
        "tags": [t.strip() for t in tags.split(",") if t.strip()] if tags else [],
    }

    cases_db[case_id] = new_case
    print(f"Case created: {case_id} by {user.get('name', user['id'])}")
    return new_case


@app.post("/api/cases/{case_id}/messages")
async def add_case_message(case_id: str, msg: CaseMessageRequest, request: Request):
    """Add a message to a case's chat."""
    case = cases_db.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="病例不存在")

    user = get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    now = datetime.datetime.now()
    message = {
        "id": str(uuid.uuid4())[:8],
        "senderId": user["id"],
        "senderName": user.get("name", "未知"),
        "senderRole": user.get("role", "patient").upper(),
        "text": msg.text,
        "timestamp": now.strftime("%Y/%m/%d %H:%M"),
    }

    case["messages"].append(message)

    # Update unread flags
    if user.get("role") == "doctor":
        case["hasUnreadForPatient"] = True
    else:
        case["hasUnreadForDoctor"] = True

    return message


@app.post("/api/cases/{case_id}/diagnosis")
async def submit_case_diagnosis(case_id: str, diag: DiagnosisRequest, request: Request):
    """Doctor submits an official diagnosis for a case."""
    case = cases_db.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="病例不存在")

    user = get_user_from_request(request)
    if not user:
        raise HTTPException(status_code=401, detail="请先登录")

    now = datetime.datetime.now()
    case["status"] = "completed"
    case["doctorFeedback"] = diag.feedback
    case["doctorName"] = user.get("name", "医生")
    case["replyTimestamp"] = now.strftime("%Y/%m/%d %H:%M")
    case["hasUnreadForPatient"] = True

    print(f"Diagnosis submitted for case {case_id} by {user.get('name')}")
    return case


@app.patch("/api/cases/{case_id}/read")
async def mark_case_read(case_id: str, request: Request):
    """Mark a case as read for the current user."""
    case = cases_db.get(case_id)
    if not case:
        raise HTTPException(status_code=404, detail="病例不存在")

    user = get_user_from_request(request)
    if not user:
        return {"ok": True}

    if user.get("role") == "doctor":
        case["hasUnreadForDoctor"] = False
    else:
        case["hasUnreadForPatient"] = False

    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
