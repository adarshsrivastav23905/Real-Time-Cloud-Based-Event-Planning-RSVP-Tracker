"""
Database engine and session management using SQLAlchemy async.
Demonstrates cloud database concepts with local SQLite for development.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

# Create async engine — in production, replace SQLite with a cloud database URL
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False}  # SQLite-specific
)

# Session factory for dependency injection
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db() -> AsyncSession:
    """
    FastAPI dependency that yields a database session.
    Ensures proper cleanup after each request.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Create all tables on startup. In production, use migrations (Alembic)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
