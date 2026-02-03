"""
Configuration module for the Finance Bot API.
Loads environment variables and provides settings for all services.
"""
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Google Sheets (optional)
    GOOGLE_SHEETS_CREDENTIALS: Optional[str] = None
    SPREADSHEET_ID: Optional[str] = None
    
    # Twilio WhatsApp
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: str
    
    # Google Gemini AI
    GEMINI_API_KEY: str
    
    # Frontend URL (for CORS)
    FRONTEND_URL: str = "http://localhost:5173"
    
    # App Configuration
    DEBUG: bool = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
