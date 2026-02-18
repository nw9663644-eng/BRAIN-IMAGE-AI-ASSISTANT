import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""  # anon/public key for client-side, or service_role key for backend

    # Google Gemini AI
    GEMINI_API_KEY: str = ""

    # JWT / Auth
    JWT_SECRET: str = "neurogen-connect-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # App
    APP_NAME: str = "NeuroGen Connect Backend"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
