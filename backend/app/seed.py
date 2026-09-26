"""
Seed script to populate the database with sample/demo data.
Creates organizer and attendee accounts, events, and RSVPs for demonstration.

Usage:
  python -m app.seed
"""

import asyncio
import datetime
from app.database import init_db, async_session
from app.models import User, Event, RSVP, Announcement, Notification
from app.auth import hash_password


async def seed():
    """Populate database with synthetic demo data."""
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        from sqlalchemy import select, func
        count = await db.execute(select(func.count()).select_from(User))
        if count.scalar() > 0:
            print("[INFO] Database already has data. Skipping seed.")
            return

        print("[SEED] Seeding database with demo data...")

        # ─── Users ────────────────────────────────────────────
        organizer1 = User(
            id="org-001",
            username="organizer1",
            email="organizer1@example.com",
            hashed_password=hash_password("password123"),
            full_name="Priya Sharma",
            role="organizer",
        )
        organizer2 = User(
            id="org-002",
            username="organizer2",
            email="organizer2@example.com",
            hashed_password=hash_password("password123"),
            full_name="Rahul Verma",
            role="organizer",
        )
        attendees = []
        for i in range(1, 11):
            attendees.append(User(
                id=f"att-{i:03d}",
                username=f"attendee{i}",
                email=f"attendee{i}@example.com",
                hashed_password=hash_password("password123"),
                full_name=f"Attendee {i}",
                role="attendee",
            ))
        admin = User(
            id="admin-001",
            username="admin",
            email="admin@example.com",
            hashed_password=hash_password("admin123"),
            full_name="Platform Admin",
            role="admin",
        )

        db.add_all([organizer1, organizer2, admin] + attendees)

        # ─── Events ──────────────────────────────────────────
        now = datetime.datetime.utcnow()
        event1 = Event(
            id="evt-001",
            organizer_id="org-001",
            event_name="Cloud Computing Workshop 2025",
            description="An intensive hands-on workshop covering AWS, Azure, and GCP fundamentals. Learn cloud architecture, deployment, and security best practices.",
            event_type="workshop",
            event_date=now + datetime.timedelta(days=30),
            start_time="09:00",
            end_time="17:00",
            venue="Tech Hub Auditorium, Bangalore",
            online_link="https://meet.google.com/abc-defg-hij",
            max_capacity=100,
            registration_deadline=now + datetime.timedelta(days=25),
            status="published",
        )
        event2 = Event(
            id="evt-002",
            organizer_id="org-001",
            event_name="React & FastAPI Bootcamp",
            description="Full-stack development bootcamp covering React frontend with FastAPI backend. Build real-world projects.",
            event_type="bootcamp",
            event_date=now + datetime.timedelta(days=45),
            start_time="10:00",
            end_time="16:00",
            venue="Innovation Lab, Mumbai",
            max_capacity=50,
            registration_deadline=now + datetime.timedelta(days=40),
            status="published",
        )
        event3 = Event(
            id="evt-003",
            organizer_id="org-002",
            event_name="AI/ML Conference 2025",
            description="Annual conference featuring talks on machine learning, deep learning, NLP, and AI ethics from industry leaders.",
            event_type="conference",
            event_date=now + datetime.timedelta(days=60),
            start_time="09:30",
            end_time="18:00",
            venue="Grand Convention Center, Delhi",
            online_link="https://zoom.us/j/123456789",
            max_capacity=200,
            registration_deadline=now + datetime.timedelta(days=55),
            status="published",
        )
        event4 = Event(
            id="evt-004",
            organizer_id="org-002",
            event_name="DevOps Meetup",
            description="Monthly DevOps community meetup. Topics: Docker, Kubernetes, CI/CD pipelines, monitoring.",
            event_type="meetup",
            event_date=now + datetime.timedelta(days=15),
            start_time="18:00",
            end_time="20:00",
            venue="CoWork Space, Pune",
            max_capacity=5,  # Small capacity for testing waitlist
            registration_deadline=now + datetime.timedelta(days=14),
            status="published",
        )
        event5 = Event(
            id="evt-005",
            organizer_id="org-001",
            event_name="Cybersecurity Awareness Seminar",
            description="Learn about common cyber threats, phishing prevention, password hygiene, and secure coding practices.",
            event_type="seminar",
            event_date=now + datetime.timedelta(days=20),
            start_time="14:00",
            end_time="16:00",
            venue="Online Only",
            online_link="https://teams.microsoft.com/l/meetup-join/xyz",
            max_capacity=300,
            registration_deadline=now + datetime.timedelta(days=18),
            status="published",
        )

        db.add_all([event1, event2, event3, event4, event5])

        # ─── Sample RSVPs ────────────────────────────────────
        sample_rsvps = [
            RSVP(event_id="evt-001", user_id="att-001", status="going"),
            RSVP(event_id="evt-001", user_id="att-002", status="going"),
            RSVP(event_id="evt-001", user_id="att-003", status="maybe"),
            RSVP(event_id="evt-001", user_id="att-004", status="not_going"),
            RSVP(event_id="evt-001", user_id="att-005", status="going"),
            RSVP(event_id="evt-002", user_id="att-001", status="going"),
            RSVP(event_id="evt-002", user_id="att-006", status="maybe"),
            RSVP(event_id="evt-003", user_id="att-002", status="going"),
            RSVP(event_id="evt-003", user_id="att-003", status="going"),
            RSVP(event_id="evt-003", user_id="att-007", status="maybe"),
            RSVP(event_id="evt-004", user_id="att-001", status="going"),
            RSVP(event_id="evt-004", user_id="att-002", status="going"),
            RSVP(event_id="evt-004", user_id="att-003", status="going"),
        ]
        db.add_all(sample_rsvps)

        # ─── Sample Announcements ────────────────────────────
        db.add(Announcement(
            event_id="evt-001",
            title="Venue Confirmed!",
            message="The Cloud Computing Workshop will be held at Tech Hub Auditorium. Parking is available. Bring your laptops!"
        ))
        db.add(Announcement(
            event_id="evt-001",
            title="Speaker Lineup Released",
            message="We have confirmed speakers from AWS, Microsoft, and Google Cloud. Full agenda coming soon."
        ))

        # ─── Sample Notifications ────────────────────────────
        for att in attendees[:5]:
            db.add(Notification(
                user_id=att.id,
                event_id="evt-001",
                type="rsvp_confirmed",
                message="Your RSVP for 'Cloud Computing Workshop 2025' has been confirmed."
            ))

        await db.commit()
        print("[SUCCESS] Database seeded successfully!")
        print("\n=== Demo Accounts ===")
        print("  Organizer: organizer1 / password123")
        print("  Organizer: organizer2 / password123")
        print("  Attendee:  attendee1-10 / password123")
        print("  Admin:     admin / admin123")


if __name__ == "__main__":
    asyncio.run(seed())
