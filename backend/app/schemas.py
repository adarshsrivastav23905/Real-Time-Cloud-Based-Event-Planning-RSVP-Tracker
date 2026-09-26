"""
Pydantic schemas for request/response validation.
Provides type safety and automatic API documentation.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────

class UserRole(str, Enum):
    attendee = "attendee"
    organizer = "organizer"
    admin = "admin"


class EventStatus(str, Enum):
    draft = "draft"
    published = "published"
    full = "full"
    completed = "completed"
    cancelled = "cancelled"


class RSVPStatus(str, Enum):
    going = "going"
    maybe = "maybe"
    not_going = "not_going"


# ─── Auth Schemas ─────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)
    role: UserRole = UserRole.attendee


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ─── Event Schemas ────────────────────────────────────────────────

class EventCreate(BaseModel):
    event_name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    event_type: str = "general"
    event_date: datetime
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # "09:00"
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    venue: str = ""
    online_link: str = ""
    max_capacity: int = Field(..., ge=1, le=100000)
    registration_deadline: datetime
    status: EventStatus = EventStatus.draft
    banner_url: str = ""


class EventUpdate(BaseModel):
    event_name: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue: Optional[str] = None
    online_link: Optional[str] = None
    max_capacity: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    status: Optional[EventStatus] = None
    banner_url: Optional[str] = None


class EventResponse(BaseModel):
    id: str
    organizer_id: str
    event_name: str
    description: str
    event_type: str
    event_date: datetime
    start_time: str
    end_time: str
    venue: str
    online_link: str
    max_capacity: int
    registration_deadline: datetime
    status: str
    banner_url: str
    created_at: datetime
    updated_at: datetime
    organizer_name: Optional[str] = None
    going_count: Optional[int] = 0
    maybe_count: Optional[int] = 0
    not_going_count: Optional[int] = 0
    waitlist_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── RSVP Schemas ─────────────────────────────────────────────────

class RSVPCreate(BaseModel):
    status: RSVPStatus
    guests_count: Optional[int] = Field(default=0, ge=0, le=10)


class RSVPUpdate(BaseModel):
    status: RSVPStatus
    guests_count: Optional[int] = Field(default=0, ge=0, le=10)


class RSVPCheckInRequest(BaseModel):
    rsvp_id: Optional[str] = None
    user_id: Optional[str] = None
    event_id: Optional[str] = None


class RSVPResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    status: str
    guests_count: int = 0
    checked_in: bool = False
    checked_in_at: Optional[datetime] = None
    responded_at: datetime
    updated_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    event_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Announcement Schemas ─────────────────────────────────────────

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)


class AnnouncementResponse(BaseModel):
    id: str
    event_id: str
    title: str
    message: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Notification Schemas ─────────────────────────────────────────

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    event_id: Optional[str]
    type: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Analytics Schemas ────────────────────────────────────────────

class EventAnalytics(BaseModel):
    event_id: str
    event_name: str
    total_rsvps: int
    going_count: int
    maybe_count: int
    not_going_count: int
    checked_in_count: int = 0
    response_rate: float  # percentage
    capacity_utilization: float  # percentage
    available_seats: int
    waitlist_count: int
    max_capacity: int


class OrganizerDashboard(BaseModel):
    total_events: int
    upcoming_events: int
    total_responses: int
    total_going: int
    total_maybe: int
    total_not_going: int
    total_checked_in: int = 0
    overall_response_rate: float
    events: List[EventAnalytics]
