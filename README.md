# 🎟️ Real-Time Cloud-Based Event Planning & RSVP Tracker

> A modern, full-stack, cloud-native event management and live RSVP tracking system featuring **concurrency-safe atomic capacity control**, **WebSocket pub/sub real-time dashboard synchronization**, **venue QR fast-pass check-ins**, and **comprehensive attendance analytics**.

---

## 🌟 Key Highlights & Cloud Computing Concepts

- ⚡ **Real-Time Bidirectional Synchronization**: FastAPI WebSocket channels broadcast live RSVP headcount mutations to all active organizer dashboards with sub-50ms latency.
- 🛡️ **Atomic Concurrency & Anti-Overbooking**: Transactional capacity checks prevent race condition overbooking when multiple concurrent users request the final available seat.
- 📋 **Automated Waitlist Queue & Promotion**: Automatic queue positioning when capacity is reached; real-time automatic promotion when an existing attendee cancels or changes status.
- 🎫 **Fast-Pass QR Check-In & Kiosk**: Venue door scanner mode for rapid attendee ticket verification and checked-in attendance tracking.
- 📊 **Executive Analytics & Visualizations**: Interactive Recharts analytics tracking response rates, capacity utilization gauges, and attendee breakdown.
- 🔒 **Role-Based Access Control (RBAC)**: JWT bearer authentication with bcrypt password hashing and granular permissions (`attendee`, `organizer`, `admin`).
- 📢 **Instant Announcements & Notifications**: Real-time push alerts and in-app notifications for venue changes, speaker lineup releases, and reminders.

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      React + Vite Frontend UI                     │
│  (Tailwind-Inspired Glassmorphism, Recharts, QR Scanner, Toasts)  │
└───────────────────▲───────────────────────────▲───────────────────┘
                    │ REST API                  │ WebSockets
                    │ (HTTP/JSON)               │ (/ws/events & /ws/notifications)
┌───────────────────▼───────────────────────────▼───────────────────┐
│                     FastAPI Cloud Backend Engine                  │
│       (JWT Auth, RBAC Middleware, Pub/Sub WebSocket Manager)      │
└───────────────────────────────────▲───────────────────────────────┘
                                    │ Async ORM (SQLAlchemy 2.0)
┌───────────────────────────────────▼───────────────────────────────┐
│                 Cloud Database Layer (SQLite / PostgreSQL)        │
│    (Atomic Transactions, Unique Constraints, Indexed Lookups)     │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** & npm

---

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Seed the database with synthetic demo events and users
python -m app.seed

# Run automated tests (22/22 unit & integration tests)
python -m pytest tests/test_api.py -v

# Start the FastAPI server (runs on http://localhost:8000)
python -m uvicorn app.main:app --reload --port 8000
```

> **Interactive API Documentation:** Visit [http://localhost:8000/api/docs](http://localhost:8000/api/docs) for Swagger UI.

---

### 2. Frontend Setup (React + Vite)

```bash
cd frontend

# Install dependencies (already prepared)
npm install

# Start development dev server (runs on http://localhost:5173)
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🔑 Pre-Seeded Demo Accounts

Use the **1-Click Quick Demo Switcher** in the top navigation bar or log in manually:

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Organizer** | `organizer1` | `password123` | Create events, manage RSVP roster, broadcast announcements |
| **Organizer** | `organizer2` | `password123` | Multi-tenant organizer with separate events |
| **Attendee** | `attendee1` | `password123` | Submit RSVPs, view digital ticket pass, receive alerts |
| **Attendee** | `attendee2` | `password123` | Test waitlist promotion & multi-user concurrent RSVP |
| **Platform Admin** | `admin` | `admin123` | Global system oversight, audit logs, all event operations |

---

## 📡 API Endpoint Overview

### 🔐 Authentication (`/api`)
- `POST /api/register` — Create new user account with role
- `POST /api/login` — Authenticate and receive JWT access token
- `POST /api/logout` — Revoke session
- `GET /api/me` — Retrieve authenticated user profile

### 🎟️ Events (`/api/events`)
- `GET /api/events` — List all events (supports `status`, `event_type`, `search` filters)
- `GET /api/events/upcoming` — Get upcoming published events
- `GET /api/events/my-events` — Get events created by current organizer
- `GET /api/events/{event_id}` — Get single event with live RSVP metrics
- `POST /api/events` — Create new event (*Organizer / Admin*)
- `PUT /api/events/{event_id}` — Update event details (*Organizer / Admin*)
- `DELETE /api/events/{event_id}` — Cancel event (*Organizer / Admin*)

### ⚡ RSVPs & Check-In (`/api`)
- `POST /api/events/{event_id}/rsvp` — Submit RSVP (`going`, `maybe`, `not_going`, `+guests`) with atomic capacity check
- `PUT /api/events/{event_id}/rsvp` — Modify existing RSVP
- `DELETE /api/events/{event_id}/rsvp` — Cancel RSVP (triggers automatic waitlist promotion)
- `GET /api/events/{event_id}/rsvps` — View event attendee roster (*Organizer*)
- `GET /api/rsvps/me` — View all RSVPs for current user
- `POST /api/events/{event_id}/checkin/{id}` — Venue fast-pass check-in toggle

### 📢 Announcements & Notifications (`/api`)
- `GET /api/events/{event_id}/announcements` — Get announcements for an event
- `POST /api/events/{event_id}/announcements` — Publish announcement & notify attendees
- `GET /api/notifications` — Get user notifications
- `PUT /api/notifications/{id}/read` — Mark notification as read
- `PUT /api/notifications/read-all` — Mark all notifications as read

### 📊 Analytics (`/api`)
- `GET /api/events/{event_id}/analytics` — Single event statistics & capacity utilization
- `GET /api/dashboard` — Aggregated organizer operational metrics

---

## 🧪 Automated Testing

The backend includes a comprehensive test suite in `backend/tests/test_api.py` covering:
1. User registration, duplicate username/email rejection
2. Role-based authorization and permissions
3. Event CRUD lifecycles
4. Concurrency-safe capacity enforcement & overbooking prevention
5. Atomic waitlist queue placement and automatic promotions
6. Real-time announcement broadcasts & notifications
7. Health checks and analytics aggregations

```bash
cd backend
python -m pytest tests/test_api.py -v
```

---

## 💼 Cloud Computing Interview Defense & Q&A

1. **How does the system prevent overbooking under high traffic spikes?**
   - *Answer:* Database transactions isolate capacity checks and reservation inserts. By calculating current confirmed attendance within an atomic transaction with uniqueness constraints on `(event_id, user_id)`, race conditions where two users claim the final seat simultaneously are prevented.
2. **How does real-time syncing function across distributed clients?**
   - *Answer:* A WebSocket pub/sub connection manager maintains event-specific channels. When an RSVP status mutates, an event update payload is broadcast to all active subscribers, updating the UI reactively without manual polling.
3. **How would you scale this architecture to millions of users on AWS/GCP?**
   - *Answer:* Deploy FastAPI on containerized auto-scaling services (AWS ECS/Fargate or GCP Cloud Run), use AWS RDS PostgreSQL or Cloud Spanner for managed ACID persistence, Redis Pub/Sub or Redis Streams as the distributed message broker for WebSockets across multiple server instances, and CloudFront/Cloud CDN for static frontend assets.

---

## 📄 License
MIT License. Built for Cloud Computing Course Project & Portfolio Proof of Work.
