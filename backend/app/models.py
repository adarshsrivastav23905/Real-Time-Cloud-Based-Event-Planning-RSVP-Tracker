"""
SQLAlchemy ORM models for the Cloud Event RSVP Tracker.

Tables:
  - users: Stores user accounts with roles (attendee, organizer, admin)
  - events: Stores event details with capacity and status
  - rsvps: Stores RSVP responses with uniqueness constraint (event_id, user_id)
  - waitlist: Optional waitlist for full-capacity events
  - announcements: Event announcements published by organizers
  - notifications: In-app notification system
  - audit_logs: Tracks important actions for security/compliance
"""

import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, Text,
    ForeignKey, UniqueConstraint, Index, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    """Generate a new UUID string for primary keys."""
    return str(uuid.uuid4())


class User(Base):
    """User account model with role-based access control."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="attendee")  # attendee, organizer, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    events = relationship("Event", back_populates="organizer", cascade="all, delete-orphan")
    rsvps = relationship("RSVP", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Event(Base):
    """Event model with full lifecycle management."""
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=generate_uuid)
    organizer_id = Column(String, ForeignKey("users.id"), nullable=False)
    event_name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    event_type = Column(String(50), default="general")  # workshop, conference, meetup, webinar, etc.
    event_date = Column(DateTime, nullable=False)
    start_time = Column(String(10), nullable=False)  # "09:00"
    end_time = Column(String(10), nullable=False)      # "17:00"
    venue = Column(String(300), default="")
    online_link = Column(String(500), default="")
    max_capacity = Column(Integer, nullable=False, default=100)
    registration_deadline = Column(DateTime, nullable=False)
    status = Column(String(20), default="draft")  # draft, published, full, completed, cancelled
    banner_url = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    organizer = relationship("User", back_populates="events")
    rsvps = relationship("RSVP", back_populates="event", cascade="all, delete-orphan")
    waitlist_entries = relationship("Waitlist", back_populates="event", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="event", cascade="all, delete-orphan")

    # Indexes for performance
    __table_args__ = (
        Index("ix_events_status", "status"),
        Index("ix_events_event_date", "event_date"),
    )


class RSVP(Base):
    """
    RSVP model — one active RSVP per user per event.
    The UniqueConstraint on (event_id, user_id) prevents duplicates at the DB level.
    """
    __tablename__ = "rsvps"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False, default="going")  # going, maybe, not_going
    guests_count = Column(Integer, default=0)  # +1 / additional guests
    checked_in = Column(Boolean, default=False)  # Venue check-in status
    checked_in_at = Column(DateTime, nullable=True)
    responded_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    event = relationship("Event", back_populates="rsvps")
    user = relationship("User", back_populates="rsvps")

    # Unique constraint: one RSVP per user per event
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_rsvp_event_user"),
        Index("ix_rsvps_event_status", "event_id", "status"),
        Index("ix_rsvps_checked_in", "event_id", "checked_in"),
    )


class Waitlist(Base):
    """Waitlist for events that have reached maximum capacity."""
    __tablename__ = "waitlist"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    position = Column(Integer, nullable=False)
    status = Column(String(20), default="waiting")  # waiting, promoted, expired

    event = relationship("Event", back_populates="waitlist_entries")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_waitlist_event_user"),
        Index("ix_waitlist_position", "event_id", "position"),
    )


class Announcement(Base):
    """Event announcements published by the organizer."""
    __tablename__ = "announcements"

    id = Column(String, primary_key=True, default=generate_uuid)
    event_id = Column(String, ForeignKey("events.id"), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    event = relationship("Event", back_populates="announcements")


class Notification(Base):
    """In-app notification system for users."""
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    event_id = Column(String, nullable=True)  # Optional reference
    type = Column(String(50), nullable=False)  # rsvp_confirmed, event_reminder, venue_change, etc.
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )


class AuditLog(Base):
    """Audit trail for security-critical actions."""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)  # event, rsvp, user
    resource_id = Column(String, nullable=True)
    details = Column(Text, default="")
    ip_address = Column(String(50), default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    __table_args__ = (
        Index("ix_audit_timestamp", "timestamp"),
    )
