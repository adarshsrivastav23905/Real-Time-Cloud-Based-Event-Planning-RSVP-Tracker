"""
Event management routes: Full CRUD with role-based authorization.
Only organizers can create/update/delete events; all authenticated users can view.
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from app.database import get_db
from app.models import Event, RSVP, User, Waitlist, AuditLog
from app.schemas import EventCreate, EventUpdate, EventResponse
from app.auth import get_current_user, require_role
from app.realtime import manager

router = APIRouter(prefix="/api/events", tags=["Events"])


async def _enrich_event(event: Event, db: AsyncSession) -> EventResponse:
    """Add RSVP counts and organizer name to event response."""
    # Count RSVPs by status
    going = await db.execute(
        select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
            and_(RSVP.event_id == event.id, RSVP.status == "going")
        )
    )
    maybe = await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event.id, RSVP.status == "maybe"))
    )
    not_going = await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event.id, RSVP.status == "not_going"))
    )
    waitlist = await db.execute(
        select(func.count()).where(and_(Waitlist.event_id == event.id, Waitlist.status == "waiting"))
    )

    # Get organizer name
    org_result = await db.execute(select(User.full_name).where(User.id == event.organizer_id))
    org_name = org_result.scalar_one_or_none() or "Unknown"

    resp = EventResponse.model_validate(event)
    resp.going_count = going.scalar() or 0
    resp.maybe_count = maybe.scalar() or 0
    resp.not_going_count = not_going.scalar() or 0
    resp.waitlist_count = waitlist.scalar() or 0
    resp.organizer_name = org_name
    return resp


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_data: EventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("organizer", "admin"))
):
    """
    Create a new event (organizer/admin only).
    Validates dates, times, capacity, and registration deadline.
    """
    # Validate event_date is in the future
    if event_data.event_date < datetime.datetime.utcnow():
        raise HTTPException(status_code=400, detail="Event date must be in the future")

    # Validate registration deadline is before event date
    if event_data.registration_deadline > event_data.event_date:
        raise HTTPException(status_code=400, detail="Registration deadline must be before event date")

    # Validate start_time < end_time
    if event_data.start_time >= event_data.end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time")

    new_event = Event(
        organizer_id=current_user.id,
        event_name=event_data.event_name,
        description=event_data.description,
        event_type=event_data.event_type,
        event_date=event_data.event_date,
        start_time=event_data.start_time,
        end_time=event_data.end_time,
        venue=event_data.venue,
        online_link=event_data.online_link,
        max_capacity=event_data.max_capacity,
        registration_deadline=event_data.registration_deadline,
        status=event_data.status.value,
        banner_url=event_data.banner_url,
    )
    db.add(new_event)

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="create_event",
        resource_type="event",
        resource_id=new_event.id,
        details=f"Event '{event_data.event_name}' created"
    ))

    await db.commit()
    await db.refresh(new_event)
    return await _enrich_event(new_event, db)


@router.get("", response_model=List[EventResponse])
async def get_events(
    status_filter: Optional[str] = Query(None, alias="status"),
    event_type: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all events with optional filters.
    Supports filtering by status, type, and text search.
    """
    query = select(Event)

    if status_filter:
        query = query.where(Event.status == status_filter)
    if event_type:
        query = query.where(Event.event_type == event_type)
    if search:
        query = query.where(Event.event_name.ilike(f"%{search}%"))

    query = query.order_by(Event.event_date.asc())
    result = await db.execute(query)
    events = result.scalars().all()

    enriched = []
    for event in events:
        enriched.append(await _enrich_event(event, db))
    return enriched


@router.get("/upcoming", response_model=List[EventResponse])
async def get_upcoming_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all upcoming published events."""
    now = datetime.datetime.utcnow()
    result = await db.execute(
        select(Event)
        .where(and_(
            Event.event_date >= now,
            Event.status.in_(["published", "full"])
        ))
        .order_by(Event.event_date.asc())
    )
    events = result.scalars().all()
    return [await _enrich_event(e, db) for e in events]


@router.get("/my-events", response_model=List[EventResponse])
async def get_my_events(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("organizer", "admin"))
):
    """Get events created by the current organizer."""
    result = await db.execute(
        select(Event)
        .where(Event.organizer_id == current_user.id)
        .order_by(Event.created_at.desc())
    )
    events = result.scalars().all()
    return [await _enrich_event(e, db) for e in events]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single event by ID with RSVP counts."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return await _enrich_event(event, db)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("organizer", "admin"))
):
    """
    Update an event (only the organizer who created it or admin).
    Authorization: organizer can only modify their own events.
    """
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Authorization: only the event's organizer or admin can update
    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to modify this event")

    # Apply updates
    update_data = event_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "status":
                setattr(event, field, value.value if hasattr(value, 'value') else value)
            else:
                setattr(event, field, value)

    event.updated_at = datetime.datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="update_event",
        resource_type="event",
        resource_id=event_id,
        details=f"Event updated: {list(update_data.keys())}"
    ))

    await db.commit()
    await db.refresh(event)

    # Broadcast event update via WebSocket
    enriched = await _enrich_event(event, db)
    await manager.broadcast_event_update(event_id, {
        "status": event.status,
        "event_name": event.event_name,
        "venue": event.venue,
    })

    return enriched


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("organizer", "admin"))
):
    """Cancel/delete an event. Sets status to 'cancelled'."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this event")

    event.status = "cancelled"
    event.updated_at = datetime.datetime.utcnow()

    db.add(AuditLog(
        user_id=current_user.id,
        action="cancel_event",
        resource_type="event",
        resource_id=event_id,
        details=f"Event '{event.event_name}' cancelled"
    ))

    await db.commit()

    # Broadcast cancellation
    await manager.broadcast_event_update(event_id, {
        "status": "cancelled",
        "message": f"Event '{event.event_name}' has been cancelled"
    })

    return {"message": "Event cancelled successfully"}
