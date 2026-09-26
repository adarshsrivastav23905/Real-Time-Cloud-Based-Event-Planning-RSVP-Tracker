"""
WebSocket connection manager for real-time RSVP updates.

This module implements a pub/sub pattern where:
  - Organizer dashboards subscribe to event-specific channels
  - When any RSVP changes, all subscribers for that event get notified
  - This provides instant dashboard updates WITHOUT manual refresh

Architecture:
  Client A (RSVP) → REST API → DB Update → WebSocket Broadcast → Client B (Dashboard)
"""

import json
import asyncio
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """
    Manages WebSocket connections organized by event_id channels.
    Supports broadcasting real-time RSVP count updates to all
    connected clients watching a specific event.
    """

    def __init__(self):
        # Maps event_id → set of active WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        # Global connections (for general notifications)
        self._global_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, event_id: str):
        """Accept and register a WebSocket connection for an event channel."""
        await websocket.accept()
        if event_id not in self._connections:
            self._connections[event_id] = set()
        self._connections[event_id].add(websocket)

    async def connect_user(self, websocket: WebSocket, user_id: str):
        """Accept and register a WebSocket for user-specific notifications."""
        await websocket.accept()
        if user_id not in self._global_connections:
            self._global_connections[user_id] = set()
        self._global_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, event_id: str):
        """Remove a WebSocket from an event channel."""
        if event_id in self._connections:
            self._connections[event_id].discard(websocket)
            if not self._connections[event_id]:
                del self._connections[event_id]

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        """Remove a user-specific WebSocket connection."""
        if user_id in self._global_connections:
            self._global_connections[user_id].discard(websocket)
            if not self._global_connections[user_id]:
                del self._global_connections[user_id]

    async def broadcast_rsvp_update(self, event_id: str, data: dict):
        """
        Broadcast RSVP count updates to all clients watching this event.
        This is the core real-time mechanism: when any RSVP changes,
        all connected dashboards see the new counts immediately.
        """
        if event_id not in self._connections:
            return

        message = json.dumps({
            "type": "rsvp_update",
            "event_id": event_id,
            "data": data
        })

        dead_connections = set()
        for ws in self._connections[event_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        # Clean up dead connections
        for ws in dead_connections:
            self._connections[event_id].discard(ws)

    async def send_notification(self, user_id: str, notification: dict):
        """Send a notification to a specific user's WebSocket connections."""
        if user_id not in self._global_connections:
            return

        message = json.dumps({
            "type": "notification",
            "data": notification
        })

        dead_connections = set()
        for ws in self._global_connections[user_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        for ws in dead_connections:
            self._global_connections[user_id].discard(ws)

    async def broadcast_event_update(self, event_id: str, data: dict):
        """Broadcast event status changes (cancelled, full, etc.)."""
        if event_id not in self._connections:
            return

        message = json.dumps({
            "type": "event_update",
            "event_id": event_id,
            "data": data
        })

        dead_connections = set()
        for ws in self._connections[event_id]:
            try:
                await ws.send_text(message)
            except Exception:
                dead_connections.add(ws)

        for ws in dead_connections:
            self._connections[event_id].discard(ws)

    def get_connection_count(self, event_id: str) -> int:
        """Get the number of active connections for an event."""
        return len(self._connections.get(event_id, set()))


# Singleton instance used across the application
manager = ConnectionManager()
