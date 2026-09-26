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
from app.main import app
from app.database import init_db, engine, Base





@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    """Create fresh database tables for testing."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ─── Storage for tokens ──────────────────────────────────────────
tokens = {}
event_ids = {}


# ═══════════════════════════════════════════════════════════════════
# TEST 1: User Registration
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_01_register_organizer(client):
    """Test: Organizer registration succeeds."""
    resp = await client.post("/api/register", json={
        "username": "test_organizer",
        "email": "test_org@example.com",
        "password": "testpass123",
        "full_name": "Test Organizer",
        "role": "organizer"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["user"]["role"] == "organizer"
    tokens["organizer"] = data["access_token"]


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
        "username": "test_organizer",
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
        "username": "test_organizer",
        "password": "testpass123"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_06_login_failure(client):
    """Test: Login with wrong password fails."""
    resp = await client.post("/api/login", json={
        "username": "test_organizer",
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
