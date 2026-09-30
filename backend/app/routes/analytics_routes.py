"""
Analytics routes: Event analytics and organizer dashboard data.
Calculates RSVP statistics, response rates, capacity utilization.
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List
from app.database import get_db
from app.models import Event, RSVP, Waitlist, User
from app.schemas import EventAnalytics, OrganizerDashboard
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api", tags=["Analytics"])


async def _compute_event_analytics(event: Event, db: AsyncSession) -> EventAnalytics:
    """Compute analytics for a single event."""
    going = (await db.execute(
        select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
            and_(RSVP.event_id == event.id, RSVP.status == "going")
        )
    )).scalar() or 0

    going_responses = (await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event.id, RSVP.status == "going"))
    )).scalar() or 0

    maybe = (await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event.id, RSVP.status == "maybe"))
    )).scalar() or 0

    not_going = (await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event.id, RSVP.status == "not_going"))
    )).scalar() or 0

    waitlist = (await db.execute(
        select(func.count()).where(and_(Waitlist.event_id == event.id, Waitlist.status == "waiting"))
    )).scalar() or 0

    checked_in = (await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event.id, RSVP.checked_in == True))
    )).scalar() or 0

    total_rsvps = going_responses + maybe + not_going
    # Response rate: percentage of capacity that responded
    response_rate = (total_rsvps / event.max_capacity * 100) if event.max_capacity > 0 else 0
    # Capacity utilization: percentage of capacity filled by "going"
    capacity_utilization = (going / event.max_capacity * 100) if event.max_capacity > 0 else 0
    available_seats = max(0, event.max_capacity - going)

    return EventAnalytics(
        event_id=event.id,
        event_name=event.event_name,
        total_rsvps=total_rsvps,
        going_count=going,
        maybe_count=maybe,
        not_going_count=not_going,
        checked_in_count=checked_in,
        response_rate=round(response_rate, 1),
        capacity_utilization=round(capacity_utilization, 1),
        available_seats=available_seats,
        waitlist_count=waitlist,
        max_capacity=event.max_capacity,
    )


@router.get("/events/{event_id}/analytics", response_model=EventAnalytics)
async def get_event_analytics(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed analytics for a single event.
    Available to the event organizer or admin.
    """
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the event organizer can view analytics")

    return await _compute_event_analytics(event, db)


@router.get("/dashboard", response_model=OrganizerDashboard)
async def get_organizer_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("organizer", "admin"))
):
    """
    Get the organizer's dashboard with aggregated analytics across all their events.
    Shows total events, upcoming events, aggregate RSVP counts, and per-event analytics.
    """
    # Get all events by this organizer
    result = await db.execute(
        select(Event)
        .where(Event.organizer_id == current_user.id)
        .order_by(Event.event_date.desc())
    )
    events = result.scalars().all()

    now = datetime.datetime.utcnow()
    total_events = len(events)
    upcoming_events = sum(1 for e in events if e.event_date > now and e.status not in ("cancelled", "completed"))

    event_analytics_list = []
    total_going = 0
    total_maybe = 0
    total_not_going = 0
    total_checked_in = 0

    for event in events:
        analytics = await _compute_event_analytics(event, db)
        event_analytics_list.append(analytics)
        total_going += analytics.going_count
        total_maybe += analytics.maybe_count
        total_not_going += analytics.not_going_count
        total_checked_in += analytics.checked_in_count

    total_responses = total_going + total_maybe + total_not_going
    total_capacity = sum(e.max_capacity for e in events) or 1
    overall_response_rate = round((total_responses / total_capacity) * 100, 1) if total_capacity > 0 else 0

    return OrganizerDashboard(
        total_events=total_events,
        upcoming_events=upcoming_events,
        total_responses=total_responses,
        total_going=total_going,
        total_maybe=total_maybe,
        total_not_going=total_not_going,
        total_checked_in=total_checked_in,
        overall_response_rate=overall_response_rate,
        events=event_analytics_list,
    )
