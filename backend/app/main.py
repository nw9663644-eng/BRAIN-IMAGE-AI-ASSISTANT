"""
NeuroGen Connect Backend — FastAPI Application Entry Point.

Run with:
    cd backend
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, cases, analysis

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Backend API for NeuroGen Connect — Medical Imaging AI Diagnosis Platform",
    version="2.0.0",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(analysis.router)


@app.get("/")
def root():
    return {"status": "NeuroGen Connect Backend is Running", "version": "2.0.0"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": settings.APP_NAME}
