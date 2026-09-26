"""
Announcement and Notification routes.
Organizers can publish announcements; users receive and manage notifications.
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from app.database import get_db
from app.models import Event, RSVP, Announcement, Notification, User
from app.schemas import AnnouncementCreate, AnnouncementResponse, NotificationResponse
from app.auth import get_current_user, require_role
from app.realtime import manager

router = APIRouter(prefix="/api", tags=["Announcements & Notifications"])


# ─── Announcements ────────────────────────────────────────────────

@router.post("/events/{event_id}/announcements", response_model=AnnouncementResponse, status_code=201)
async def create_announcement(
    event_id: str,
    data: AnnouncementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("organizer", "admin"))
):
    """
    Publish an announcement for an event.
    Automatically sends notifications to all users who RSVPed.
    """
    # Verify event ownership
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to post announcements for this event")

    # Create announcement
    announcement = Announcement(
        event_id=event_id,
        title=data.title,
        message=data.message,
    )
    db.add(announcement)

    # Send notification to all RSVPed users
    rsvps_result = await db.execute(select(RSVP).where(RSVP.event_id == event_id))
    rsvps = rsvps_result.scalars().all()

    for rsvp in rsvps:
        notification = Notification(
            user_id=rsvp.user_id,
            event_id=event_id,
            type="announcement",
            message=f"📢 {event.event_name}: {data.title} — {data.message[:100]}"
        )
        db.add(notification)

        # Send real-time notification via WebSocket
        await manager.send_notification(rsvp.user_id, {
            "type": "announcement",
            "event_id": event_id,
            "title": data.title,
            "message": data.message[:200],
        })

    await db.commit()
    await db.refresh(announcement)
    return AnnouncementResponse.model_validate(announcement)


@router.get("/events/{event_id}/announcements", response_model=List[AnnouncementResponse])
async def get_announcements(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all announcements for an event."""
    result = await db.execute(
        select(Announcement)
        .where(Announcement.event_id == event_id)
        .order_by(Announcement.created_at.desc())
    )
    return [AnnouncementResponse.model_validate(a) for a in result.scalars().all()]


# ─── Notifications ────────────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all notifications for the current user."""
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    return [NotificationResponse.model_validate(n) for n in result.scalars().all()]


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == current_user.id)
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read for the current user."""
    result = await db.execute(
        select(Notification).where(
            and_(Notification.user_id == current_user.id, Notification.is_read == False)
        )
    )
    notifications = result.scalars().all()
    for n in notifications:
        n.is_read = True
    await db.commit()
    return {"message": f"{len(notifications)} notifications marked as read"}
