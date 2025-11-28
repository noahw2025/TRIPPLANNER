"""Application configuration and settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Defines runtime configuration values."""

    database_url: str  # e.g., postgresql+psycopg2://user:pass@host:5432/dbname?sslmode=require
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24

    model_config = SettingsConfigDict(
        env_prefix="TRIP_PLANNER_",
        case_sensitive=False,
        env_file=".env",
        env_file_encoding="utf-8",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached settings instance to avoid re-parsing env vars."""
    return Settings()
