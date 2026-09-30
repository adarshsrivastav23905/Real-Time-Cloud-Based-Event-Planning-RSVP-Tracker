"""
Main FastAPI application for the Cloud Event RSVP Tracker.

This is the entry point that:
  1. Initializes the database on startup
  2. Configures CORS for frontend access
  3. Registers all API routes
  4. Sets up WebSocket endpoints for real-time updates
  5. Seeds sample data for demonstration

Architecture:
  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
  │   React UI  │────▶│  FastAPI BE  │────▶│   SQLite DB  │
  │  (Vite)     │◀────│  REST + WS   │◀────│  (Async)     │
  └─────────────┘     └──────────────┘     └──────────────┘
       ▲                     │
       │    WebSocket        │
       └─────────────────────┘
         Real-time RSVP Updates
"""

import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy import select
from app.config import settings
from app.database import async_session, init_db
from app.models import User
from app.realtime import manager

# Import route modules
from app.routes.auth_routes import router as auth_router
from app.routes.event_routes import router as event_router
from app.routes.rsvp_routes import router as rsvp_router
from app.routes.analytics_routes import router as analytics_router
from app.routes.notification_routes import router as notification_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: initialize DB tables on startup."""
    print("[INFO] Starting Cloud Event RSVP Tracker...")
    await init_db()
    print("[INFO] Database initialized")
    yield
    print("[INFO] Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Real-Time Cloud-Based Event Planning & RSVP Tracker API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",      # Swagger UI
    redoc_url="/api/redoc",    # ReDoc
)

# ─── CORS Middleware ──────────────────────────────────────────────
# Allows the React frontend to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register API Routes ─────────────────────────────────────────
app.include_router(auth_router)
app.include_router(event_router)
app.include_router(rsvp_router)
app.include_router(analytics_router)
app.include_router(notification_router)


# ─── WebSocket Endpoints ─────────────────────────────────────────

async def _authenticate_websocket(websocket: WebSocket) -> User | None:
    """Authenticate browser WebSocket connections using the access token query parameter."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return None

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("Token has no subject")
    except JWTError:
        await websocket.close(code=1008)
        return None

    async with async_session() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            await websocket.close(code=1008)
            return None
        return user


@app.websocket("/ws/events/{event_id}")
async def websocket_event(websocket: WebSocket, event_id: str):
    """
    WebSocket endpoint for real-time RSVP count updates.
    
    Clients connect to /ws/events/{event_id} and receive automatic
    updates whenever any RSVP changes for that event.
    
    Message format:
    {
      "type": "rsvp_update",
      "event_id": "...",
      "data": { "going": 49, "maybe": 12, "not_going": 7, "waitlist": 3 }
    }
    """
    user = await _authenticate_websocket(websocket)
    if user is None:
        return

    await manager.connect(websocket, event_id)
    try:
        while True:
            # Keep connection alive; handle incoming pings
            data = await websocket.receive_text()
            # Echo pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, event_id)


@app.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for user-specific real-time notifications.
    Delivers announcements, RSVP confirmations, waitlist promotions etc.
    """
    user = await _authenticate_websocket(websocket)
    if user is None:
        return
    if user.id != user_id:
        await websocket.close(code=1008)
        return

    await manager.connect_user(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect_user(websocket, user_id)


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Health check endpoint for monitoring and deployment verification."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
    }


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/api/docs",
        "health": "/api/health",
    }
