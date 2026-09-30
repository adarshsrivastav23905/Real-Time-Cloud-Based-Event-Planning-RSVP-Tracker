"""
Configuration module for the Cloud Event RSVP Tracker.
Loads environment variables and provides application-wide settings.
"""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application configuration loaded from environment variables."""

    APP_NAME: str = os.getenv("APP_NAME", "Cloud Event RSVP Tracker")
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DEBUG: bool = os.getenv(
        "DEBUG", "false" if APP_ENV.lower() == "production" else "true"
    ).lower() == "true"

    # Security
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY", "development-only-secret-key-change-before-deploy"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", "sqlite+aiosqlite:///./event_tracker.db"
    )
    if DATABASE_URL.startswith(("postgres://", "postgresql://")):
        DATABASE_URL = DATABASE_URL.replace(
            "postgres://", "postgresql+asyncpg://", 1
        ).replace("postgresql://", "postgresql+asyncpg://", 1)
    if "sslmode=" in DATABASE_URL and "ssl=" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("sslmode=", "ssl=", 1)

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")
        if origin.strip()
    ]
    if APP_ENV.lower() != "production":
        CORS_ORIGINS.extend([
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
        ])

    if APP_ENV.lower() == "production":
        if DEBUG:
            raise RuntimeError("DEBUG must be false in production.")
        if (
            "SECRET_KEY" not in os.environ
            or len(SECRET_KEY) < 32
            or SECRET_KEY == "development-only-secret-key-change-before-deploy"
        ):
            raise RuntimeError(
                "Production requires a SECRET_KEY of at least 32 characters."
            )
        if not DATABASE_URL.startswith("postgresql+asyncpg://"):
            raise RuntimeError(
                "Production requires a persistent PostgreSQL DATABASE_URL."
            )
        if not os.getenv("CORS_ORIGINS") and "FRONTEND_URL" not in os.environ:
            raise RuntimeError(
                "Production requires FRONTEND_URL or CORS_ORIGINS."
            )
        if not CORS_ORIGINS or any(
            not origin.startswith("https://") for origin in CORS_ORIGINS
        ):
            raise RuntimeError(
                "Production frontend origins must use HTTPS."
            )


settings = Settings()
