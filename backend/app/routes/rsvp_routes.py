"""
RSVP routes: Submit, update, cancel RSVPs with capacity enforcement.

CRITICAL: Uses database transactions (atomic operations) to prevent race conditions
when multiple users RSVP for the last available seat simultaneously.
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List
from app.database import get_db
from app.models import Event, RSVP, User, Waitlist, Notification, AuditLog
from app.schemas import RSVPCreate, RSVPUpdate, RSVPResponse
from app.auth import get_current_user
from app.realtime import manager

router = APIRouter(prefix="/api", tags=["RSVP"])


async def _get_rsvp_counts(event_id: str, db: AsyncSession) -> dict:
    """Get current RSVP counts for an event (used for real-time broadcasts)."""
    going = await db.execute(
        select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
            and_(RSVP.event_id == event_id, RSVP.status == "going")
        )
    )
    maybe = await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event_id, RSVP.status == "maybe"))
    )
    not_going = await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event_id, RSVP.status == "not_going"))
    )
    waitlist = await db.execute(
        select(func.count()).where(and_(Waitlist.event_id == event_id, Waitlist.status == "waiting"))
    )
    checked_in = await db.execute(
        select(func.count()).where(and_(RSVP.event_id == event_id, RSVP.checked_in == True))
    )
    return {
        "going": going.scalar() or 0,
        "maybe": maybe.scalar() or 0,
        "not_going": not_going.scalar() or 0,
        "waitlist": waitlist.scalar() or 0,
        "checked_in": checked_in.scalar() or 0,
    }


@router.post("/events/{event_id}/rsvp", response_model=RSVPResponse, status_code=status.HTTP_201_CREATED)
async def create_rsvp(
    event_id: str,
    rsvp_data: RSVPCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit an RSVP for an event.

    CONCURRENCY-SAFE CAPACITY CHECK:
    ────────────────────────────────
    The event row is locked while checking capacity and writing an RSVP. This
    serializes reservations for the same event on PostgreSQL.
    """
    # 1. Validate event exists and is open for registration
    result = await db.execute(
        select(Event).where(Event.id == event_id).with_for_update()
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.status not in ("published", "full"):
        raise HTTPException(status_code=400, detail=f"Event is not accepting RSVPs (status: {event.status})")

    # 2. Check registration deadline
    if datetime.datetime.utcnow() > event.registration_deadline:
        raise HTTPException(status_code=400, detail="Registration deadline has passed")

    # 3. Check for existing RSVP (prevent duplicates via unique constraint)
    existing = await db.execute(
        select(RSVP).where(and_(RSVP.event_id == event_id, RSVP.user_id == current_user.id))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You already have an RSVP for this event. Use PUT to update.")

    # 4. ATOMIC CAPACITY CHECK for "going" RSVPs
    final_status = rsvp_data.status.value
    requested_guests = rsvp_data.guests_count or 0
    if rsvp_data.status.value == "going":
        going_count_result = await db.execute(
            select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
                and_(RSVP.event_id == event_id, RSVP.status == "going")
            )
        )
        current_going = going_count_result.scalar() or 0

        if current_going + 1 + requested_guests > event.max_capacity:
            # Event is full → add to waitlist instead
            final_status = "going"
            wl_count = await db.execute(
                select(func.count()).where(and_(Waitlist.event_id == event_id, Waitlist.status == "waiting"))
            )
            position = (wl_count.scalar() or 0) + 1

            waitlist_entry = Waitlist(
                event_id=event_id,
                user_id=current_user.id,
                position=position,
                status="waiting"
            )
            db.add(waitlist_entry)

            # Notify user about waitlist
            db.add(Notification(
                user_id=current_user.id,
                event_id=event_id,
                type="waitlisted",
                message=f"Event '{event.event_name}' is full. You've been added to the waitlist (position #{position})."
            ))

            await db.commit()

            # Broadcast updated counts
            counts = await _get_rsvp_counts(event_id, db)
            await manager.broadcast_rsvp_update(event_id, counts)

            raise HTTPException(
                status_code=409,
                detail=f"Event is at full capacity. You've been waitlisted at position #{position}."
            )

    # 5. Create RSVP record
    new_rsvp = RSVP(
        event_id=event_id,
        user_id=current_user.id,
        status=final_status,
        guests_count=requested_guests,
        checked_in=False,
    )
    db.add(new_rsvp)

    # 6. Update event status if now full
    if final_status == "going":
        going_count_result = await db.execute(
            select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
                and_(RSVP.event_id == event_id, RSVP.status == "going")
            )
        )
        if (going_count_result.scalar() or 0) >= event.max_capacity:
            event.status = "full"

    # 7. Create notification for RSVP confirmation
    status_display = {"going": "Going", "maybe": "Maybe", "not_going": "Not Going"}
    db.add(Notification(
        user_id=current_user.id,
        event_id=event_id,
        type="rsvp_confirmed",
        message=f"Your RSVP for '{event.event_name}' is confirmed: {status_display.get(final_status, final_status)}"
    ))

    # Notify organizer
    db.add(Notification(
        user_id=event.organizer_id,
        event_id=event_id,
        type="new_rsvp",
        message=f"{current_user.full_name} responded '{status_display.get(final_status, final_status)}' to '{event.event_name}'"
    ))

    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action="create_rsvp",
        resource_type="rsvp",
        resource_id=new_rsvp.id,
        details=f"RSVP '{final_status}' (guests: {requested_guests}) for event {event_id}"
    ))

    await db.commit()
    await db.refresh(new_rsvp)

    # 8. BROADCAST real-time update to all connected dashboards
    counts = await _get_rsvp_counts(event_id, db)
    await manager.broadcast_rsvp_update(event_id, counts)

    # Send notification via WebSocket to organizer
    await manager.send_notification(event.organizer_id, {
        "type": "new_rsvp",
        "event_id": event_id,
        "message": f"{current_user.full_name} → {status_display.get(final_status, final_status)}"
    })

    resp = RSVPResponse.model_validate(new_rsvp)
    resp.user_name = current_user.full_name
    resp.user_email = current_user.email
    resp.event_name = event.event_name
    return resp


@router.put("/events/{event_id}/rsvp", response_model=RSVPResponse)
async def update_rsvp(
    event_id: str,
    rsvp_data: RSVPUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an existing RSVP. Handles capacity checks when changing to 'going'.
    Users can only update their own RSVP.
    """
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).with_for_update()
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(RSVP).where(and_(RSVP.event_id == event_id, RSVP.user_id == current_user.id))
    )
    rsvp = result.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=404, detail="No RSVP found. Use POST to create one.")

    old_status = rsvp.status
    new_status = rsvp_data.status.value
    new_guests_count = (
        rsvp_data.guests_count
        if rsvp_data.guests_count is not None
        else rsvp.guests_count
    )

    if new_status == "going":
        going_count_result = await db.execute(
            select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
                and_(RSVP.event_id == event_id, RSVP.status == "going")
            )
        )
        current_going = going_count_result.scalar() or 0
        current_party_size = 1 + rsvp.guests_count if old_status == "going" else 0
        requested_party_size = 1 + new_guests_count
        if (
            current_going - current_party_size + requested_party_size
            > event.max_capacity
        ):
            raise HTTPException(status_code=409, detail="Event is at full capacity. Cannot change to Going.")

    # Update RSVP fields
    rsvp.status = new_status
    rsvp.guests_count = new_guests_count
    rsvp.updated_at = datetime.datetime.utcnow()

    # If user was "going" and changed away, promote from waitlist
    if old_status == "going" and new_status != "going":
        wl_result = await db.execute(
            select(Waitlist)
            .where(and_(Waitlist.event_id == event_id, Waitlist.status == "waiting"))
            .order_by(Waitlist.joined_at.asc())
            .limit(1)
        )
        waitlisted = wl_result.scalar_one_or_none()
        if waitlisted:
            promoted_rsvp = RSVP(
                event_id=event_id,
                user_id=waitlisted.user_id,
                status="going",
            )
            db.add(promoted_rsvp)
            waitlisted.status = "promoted"

            db.add(Notification(
                user_id=waitlisted.user_id,
                event_id=event_id,
                type="waitlist_promoted",
                message=f"A spot opened up! You've been promoted from the waitlist for '{event.event_name}'."
            ))

        if event.status == "full":
            going_count_result = await db.execute(
                select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
                    and_(RSVP.event_id == event_id, RSVP.status == "going")
                )
            )
            if (going_count_result.scalar() or 0) < event.max_capacity:
                event.status = "published"

    if new_status == "going":
        going_count_result = await db.execute(
            select(func.coalesce(func.sum(RSVP.guests_count + 1), 0)).where(
                and_(RSVP.event_id == event_id, RSVP.status == "going")
            )
        )
        current_going = going_count_result.scalar() or 0
        if current_going >= event.max_capacity:
            event.status = "full"

    db.add(AuditLog(
        user_id=current_user.id,
        action="update_rsvp",
        resource_type="rsvp",
        resource_id=rsvp.id,
        details=f"RSVP changed from '{old_status}' to '{new_status}' for event {event_id}"
    ))

    await db.commit()
    await db.refresh(rsvp)

    # Broadcast real-time update
    counts = await _get_rsvp_counts(event_id, db)
    await manager.broadcast_rsvp_update(event_id, counts)

    resp = RSVPResponse.model_validate(rsvp)
    resp.user_name = current_user.full_name
    resp.event_name = event.event_name
    return resp


@router.delete("/events/{event_id}/rsvp")
async def cancel_rsvp(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel (delete) an RSVP. Promotes waitlisted user if applicable."""
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).with_for_update()
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    result = await db.execute(
        select(RSVP).where(and_(RSVP.event_id == event_id, RSVP.user_id == current_user.id))
    )
    rsvp = result.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=404, detail="No RSVP found to cancel")

    was_going = rsvp.status == "going"
    await db.delete(rsvp)

    if was_going:
        wl_result = await db.execute(
            select(Waitlist)
            .where(and_(Waitlist.event_id == event_id, Waitlist.status == "waiting"))
            .order_by(Waitlist.joined_at.asc())
            .limit(1)
        )
        waitlisted = wl_result.scalar_one_or_none()
        if waitlisted:
            promoted_rsvp = RSVP(
                event_id=event_id,
                user_id=waitlisted.user_id,
                status="going",
            )
            db.add(promoted_rsvp)
            waitlisted.status = "promoted"
            db.add(Notification(
                user_id=waitlisted.user_id,
                event_id=event_id,
                type="waitlist_promoted",
                message=f"A spot opened up! You've been promoted from the waitlist for '{event.event_name}'."
            ))

        if event.status == "full":
            event.status = "published"

    db.add(AuditLog(
        user_id=current_user.id,
        action="cancel_rsvp",
        resource_type="rsvp",
        details=f"RSVP cancelled for event {event_id}"
    ))

    await db.commit()

    # Broadcast update
    counts = await _get_rsvp_counts(event_id, db)
    await manager.broadcast_rsvp_update(event_id, counts)

    return {"message": "RSVP cancelled successfully"}


@router.post("/events/{event_id}/checkin/{rsvp_or_user_id}", response_model=RSVPResponse)
async def checkin_attendee(
    event_id: str,
    rsvp_or_user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check-in an attendee at the venue kiosk or via QR Code scan.
    Accessible to event organizer or admin.
    """
    event_res = await db.execute(select(Event).where(Event.id == event_id))
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.organizer_id != current_user.id and current_user.role not in ("admin", "organizer"):
        raise HTTPException(status_code=403, detail="Not authorized to check in attendees for this event")

    query = select(RSVP).where(
        and_(
            RSVP.event_id == event_id,
            (RSVP.id == rsvp_or_user_id) | (RSVP.user_id == rsvp_or_user_id)
        )
    )
    res = await db.execute(query)
    rsvp = res.scalar_one_or_none()
    if not rsvp:
        raise HTTPException(status_code=404, detail="RSVP record not found for this identifier")

    if rsvp.status != "going":
        raise HTTPException(status_code=400, detail=f"Cannot check in attendee with status '{rsvp.status}'. Status must be 'going'.")

    # Toggle check-in status
    rsvp.checked_in = not rsvp.checked_in
    rsvp.checked_in_at = datetime.datetime.utcnow() if rsvp.checked_in else None

    db.add(AuditLog(
        user_id=current_user.id,
        action="checkin" if rsvp.checked_in else "uncheckin",
        resource_type="rsvp",
        resource_id=rsvp.id,
        details=f"Attendee {rsvp.user_id} {'checked in' if rsvp.checked_in else 'un-checked in'} for {event.event_name}"
    ))

    await db.commit()
    await db.refresh(rsvp)

    # Broadcast updated counts over WebSocket
    counts = await _get_rsvp_counts(event_id, db)
    await manager.broadcast_rsvp_update(event_id, counts)

    user_res = await db.execute(select(User).where(User.id == rsvp.user_id))
    user = user_res.scalar_one_or_none()
    resp = RSVPResponse.model_validate(rsvp)
    if user:
        resp.user_name = user.full_name
        resp.user_email = user.email
    resp.event_name = event.event_name
    return resp


@router.get("/events/{event_id}/rsvps", response_model=List[RSVPResponse])
async def get_event_rsvps(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all RSVPs for an event (visible to organizer or admin)."""
    event_result = await db.execute(select(Event).where(Event.id == event_id))
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.organizer_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the event organizer can view all RSVPs")

    result = await db.execute(
        select(RSVP).where(RSVP.event_id == event_id).order_by(RSVP.responded_at.desc())
    )
    rsvps = result.scalars().all()

    enriched = []
    for rsvp in rsvps:
        user_result = await db.execute(select(User).where(User.id == rsvp.user_id))
        user = user_result.scalar_one_or_none()
        resp = RSVPResponse.model_validate(rsvp)
        if user:
            resp.user_name = user.full_name
            resp.user_email = user.email
        resp.event_name = event.event_name
        enriched.append(resp)

    return enriched


@router.get("/rsvps/me", response_model=List[RSVPResponse])
async def get_my_rsvps(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all RSVPs made by the current user."""
    result = await db.execute(
        select(RSVP).where(RSVP.user_id == current_user.id).order_by(RSVP.responded_at.desc())
    )
    rsvps = result.scalars().all()

    enriched = []
    for rsvp in rsvps:
        event_result = await db.execute(select(Event).where(Event.id == rsvp.event_id))
        event = event_result.scalar_one_or_none()
        resp = RSVPResponse.model_validate(rsvp)
        resp.user_name = current_user.full_name
        resp.event_name = event.event_name if event else "Unknown"
        enriched.append(resp)

    return enriched
