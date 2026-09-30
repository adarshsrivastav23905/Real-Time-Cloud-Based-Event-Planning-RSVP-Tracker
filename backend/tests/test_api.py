"""
Automated test suite for the Cloud Event RSVP Tracker.

Covers:
  1. User registration & duplicate prevention
  2. Login & authentication
  3. Event CRUD with authorization
  4. RSVP workflow (create, update, cancel)
  5. Duplicate RSVP prevention
  6. Capacity enforcement
  7. Announcements & notifications
  8. Unauthorized access attempts
  9. Analytics

Run: pytest tests/test_api.py -v
"""

import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.main import app
from app.database import Base, get_db
from app.models import User
from app.auth import create_access_token, hash_password


tokens = {}
event_ids = {}
memory_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
db_session_factory = async_sessionmaker(memory_engine, expire_on_commit=False)


async def override_get_db():
    async with db_session_factory() as db:
        yield db


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Create an isolated in-memory database for the test suite."""
    app.dependency_overrides[get_db] = override_get_db
    async with memory_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with db_session_factory() as db:
        organizer = User(
            id="test-organizer-id",
            username="test_organizer",
            email="test_org@example.com",
            hashed_password=hash_password("testpass123"),
            full_name="Test Organizer",
            role="organizer",
        )
        db.add(organizer)
        await db.commit()
        tokens["organizer"] = create_access_token(
            {"sub": organizer.id, "username": organizer.username, "role": organizer.role}
        )

    yield
    app.dependency_overrides.pop(get_db, None)
    async with memory_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await memory_engine.dispose()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ═══════════════════════════════════════════════════════════════════
# TEST 1: Public Registration Role Restrictions
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_01_public_registration_cannot_assign_privileged_role(client):
    """Test: Public registration rejects organizer role assignment."""
    resp = await client.post("/api/register", json={
        "username": "test_organizer",
        "email": "test_org@example.com",
        "password": "testpass123",
        "full_name": "Test Organizer",
        "role": "organizer"
    })
    assert resp.status_code == 403
    assert "attendee accounts" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_02_register_attendee(client):
    """Test: Attendee registration succeeds."""
    resp = await client.post("/api/register", json={
        "username": "test_attendee",
        "email": "test_att@example.com",
        "password": "testpass123",
        "full_name": "Test Attendee",
        "role": "attendee"
    })
    assert resp.status_code == 201
    tokens["attendee"] = resp.json()["access_token"]


@pytest.mark.asyncio
async def test_03_register_attendee2(client):
    """Test: Second attendee registration."""
    resp = await client.post("/api/register", json={
        "username": "test_attendee2",
        "email": "test_att2@example.com",
        "password": "testpass123",
        "full_name": "Test Attendee 2",
        "role": "attendee"
    })
    assert resp.status_code == 201
    tokens["attendee2"] = resp.json()["access_token"]


# ═══════════════════════════════════════════════════════════════════
# TEST 2: Duplicate Registration Prevention
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_04_duplicate_username(client):
    """Test: Duplicate username is rejected."""
    resp = await client.post("/api/register", json={
        "username": "test_attendee",
        "email": "new_email@example.com",
        "password": "testpass123",
        "full_name": "Duplicate User",
        "role": "attendee"
    })
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


# ═══════════════════════════════════════════════════════════════════
# TEST 3: Login
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_05_login_success(client):
    """Test: Login with valid credentials succeeds."""
    resp = await client.post("/api/login", json={
        "username": "test_attendee",
        "password": "testpass123"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_06_login_failure(client):
    """Test: Login with wrong password fails."""
    resp = await client.post("/api/login", json={
        "username": "test_attendee",
        "password": "wrongpassword"
    })
    assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════
# TEST 4: Event Creation (Organizer)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_07_create_event(client):
    """Test: Organizer can create an event."""
    resp = await client.post("/api/events", json={
        "event_name": "Test Workshop",
        "description": "A test event for automated testing",
        "event_type": "workshop",
        "event_date": "2027-06-15T09:00:00",
        "start_time": "09:00",
        "end_time": "17:00",
        "venue": "Test Venue",
        "max_capacity": 3,
        "registration_deadline": "2027-06-10T23:59:00",
        "status": "published"
    }, headers={"Authorization": f"Bearer {tokens['organizer']}"})
    assert resp.status_code == 201
    event_ids["test_event"] = resp.json()["id"]


@pytest.mark.asyncio
async def test_event_creation_accepts_utc_timestamps(client):
    """Test: Browser-style ISO timestamps with UTC offsets are accepted."""
    resp = await client.post("/api/events", json={
        "event_name": "UTC Timestamp Workshop",
        "description": "Event creation with UTC-aware timestamps",
        "event_type": "workshop",
        "event_date": "2027-06-15T09:00:00.000Z",
        "start_time": "10:00",
        "end_time": "13:00",
        "venue": "Test Venue",
        "max_capacity": 40,
        "registration_deadline": "2027-06-10T23:59:00.000Z",
        "status": "published",
    }, headers={"Authorization": f"Bearer {tokens['organizer']}"})
    assert resp.status_code == 201, resp.text


# ═══════════════════════════════════════════════════════════════════
# TEST 5: Attendee Cannot Create Event
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_08_attendee_cannot_create_event(client):
    """Test: Attendee role cannot create events (403)."""
    resp = await client.post("/api/events", json={
        "event_name": "Unauthorized Event",
        "event_date": "2027-07-15T09:00:00",
        "start_time": "09:00",
        "end_time": "17:00",
        "max_capacity": 10,
        "registration_deadline": "2027-07-10T23:59:00",
    }, headers={"Authorization": f"Bearer {tokens['attendee']}"})
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════
# TEST 6: Event Retrieval
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_09_get_events(client):
    """Test: Authenticated user can list events."""
    resp = await client.get("/api/events",
        headers={"Authorization": f"Bearer {tokens['attendee']}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ═══════════════════════════════════════════════════════════════════
# TEST 7: Valid RSVP
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_10_create_rsvp_going(client):
    """Test: Attendee can RSVP 'going' to an event."""
    resp = await client.post(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee']}"}
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "going"


# ═══════════════════════════════════════════════════════════════════
# TEST 8: Duplicate RSVP Prevention
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_11_duplicate_rsvp_rejected(client):
    """Test: Creating a second RSVP for same event returns 409."""
    resp = await client.post(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee']}"}
    )
    assert resp.status_code == 409


# ═══════════════════════════════════════════════════════════════════
# TEST 9: Update RSVP (GOING → MAYBE)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_12_update_rsvp_to_maybe(client):
    """Test: Attendee can change RSVP from going to maybe."""
    resp = await client.put(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "maybe"},
        headers={"Authorization": f"Bearer {tokens['attendee']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "maybe"


# ═══════════════════════════════════════════════════════════════════
# TEST 10: Update RSVP (MAYBE → GOING)
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_13_update_rsvp_back_to_going(client):
    """Test: Attendee can change back to going."""
    resp = await client.put(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "going"


# ═══════════════════════════════════════════════════════════════════
# TEST 11: Capacity Enforcement
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_14_capacity_enforcement(client):
    """
    Test: Event with capacity 3.
    Attendee1 is already going. Add attendee2 as going.
    Register attendee3 and add as going (capacity 3 reached).
    """
    # Attendee 2 goes
    resp = await client.post(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee2']}"}
    )
    assert resp.status_code == 201

    # Register attendee3
    resp = await client.post("/api/register", json={
        "username": "test_attendee3",
        "email": "att3@example.com",
        "password": "testpass123",
        "full_name": "Test Attendee 3",
        "role": "attendee"
    })
    tokens["attendee3"] = resp.json()["access_token"]

    # Attendee 3 goes (capacity = 3, fills up)
    resp = await client.post(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee3']}"}
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_15_over_capacity_rejected(client):
    """Test: Fourth user trying to RSVP 'going' gets waitlisted (capacity=3)."""
    # Register attendee4
    resp = await client.post("/api/register", json={
        "username": "test_attendee4",
        "email": "att4@example.com",
        "password": "testpass123",
        "full_name": "Test Attendee 4",
        "role": "attendee"
    })
    tokens["attendee4"] = resp.json()["access_token"]

    resp = await client.post(
        f"/api/events/{event_ids['test_event']}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee4']}"}
    )
    # Should be waitlisted (409)
    assert resp.status_code == 409
    assert "waitlist" in resp.json()["detail"].lower()


# ═══════════════════════════════════════════════════════════════════
# TEST 12: Cancel RSVP
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_16_cancel_rsvp(client):
    """Test: User can cancel their RSVP."""
    resp = await client.delete(
        f"/api/events/{event_ids['test_event']}/rsvp",
        headers={"Authorization": f"Bearer {tokens['attendee3']}"}
    )
    assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════
# TEST 13: Announcement Creation
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_17_create_announcement(client):
    """Test: Organizer can create an announcement."""
    resp = await client.post(
        f"/api/events/{event_ids['test_event']}/announcements",
        json={"title": "Test Announcement", "message": "Important update for all attendees"},
        headers={"Authorization": f"Bearer {tokens['organizer']}"}
    )
    assert resp.status_code == 201


# ═══════════════════════════════════════════════════════════════════
# TEST 14: Get Notifications
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_18_get_notifications(client):
    """Test: User receives notifications."""
    resp = await client.get("/api/notifications",
        headers={"Authorization": f"Bearer {tokens['attendee']}"})
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ═══════════════════════════════════════════════════════════════════
# TEST 15: Unauthorized Event Modification
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_19_unauthorized_event_update(client):
    """Test: Attendee cannot update an organizer's event."""
    resp = await client.put(
        f"/api/events/{event_ids['test_event']}",
        json={"event_name": "Hacked Event"},
        headers={"Authorization": f"Bearer {tokens['attendee']}"}
    )
    assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════
# TEST 16: Analytics
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_20_event_analytics(client):
    """Test: Organizer can view event analytics."""
    resp = await client.get(
        f"/api/events/{event_ids['test_event']}/analytics",
        headers={"Authorization": f"Bearer {tokens['organizer']}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "going_count" in data
    assert "capacity_utilization" in data


# ═══════════════════════════════════════════════════════════════════
# TEST 17: Dashboard
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_21_organizer_dashboard(client):
    """Test: Organizer dashboard returns aggregated data."""
    resp = await client.get("/api/dashboard",
        headers={"Authorization": f"Bearer {tokens['organizer']}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_events" in data
    assert "events" in data


# ═══════════════════════════════════════════════════════════════════
# TEST 18: Health Check
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_22_health_check(client):
    """Test: Health endpoint returns healthy status."""
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_guests_count_toward_event_capacity(client):
    """Test: Plus-ones consume seats and cannot push an event over capacity."""
    event_resp = await client.post("/api/events", json={
        "event_name": "Headcount Capacity Test",
        "event_date": "2027-08-15T09:00:00",
        "start_time": "09:00",
        "end_time": "10:00",
        "max_capacity": 2,
        "registration_deadline": "2027-08-10T23:59:00",
        "status": "published",
    }, headers={"Authorization": f"Bearer {tokens['organizer']}"})
    assert event_resp.status_code == 201
    event_id = event_resp.json()["id"]

    first_rsvp = await client.post(
        f"/api/events/{event_id}/rsvp",
        json={"status": "going", "guests_count": 1},
        headers={"Authorization": f"Bearer {tokens['attendee']}"},
    )
    assert first_rsvp.status_code == 201

    oversized_update = await client.put(
        f"/api/events/{event_id}/rsvp",
        json={"status": "going", "guests_count": 2},
        headers={"Authorization": f"Bearer {tokens['attendee']}"},
    )
    assert oversized_update.status_code == 409

    second_rsvp = await client.post(
        f"/api/events/{event_id}/rsvp",
        json={"status": "going"},
        headers={"Authorization": f"Bearer {tokens['attendee2']}"},
    )
    assert second_rsvp.status_code == 409
    assert "waitlist" in second_rsvp.json()["detail"].lower()
