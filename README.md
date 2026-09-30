# 🎟️ Real-Time Cloud-Based Event Planning & RSVP Tracker

> A modern, full-stack, cloud-native event management and live RSVP tracking system featuring **concurrency-safe atomic capacity control**, **WebSocket pub/sub real-time dashboard synchronization**, **venue QR fast-pass check-ins**, and **comprehensive attendance analytics**.

---

## 🌟 Key Highlights & Cloud Computing Concepts

- ⚡ **Real-Time Bidirectional Synchronization**: Authenticated FastAPI WebSocket channels broadcast RSVP and event updates to connected clients.
- 🛡️ **Capacity & Anti-Overbooking**: PostgreSQL event-row locks serialize RSVP capacity checks; guest counts are included in seat availability.
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
│               Database (SQLite local / PostgreSQL cloud)           │
│        (Transactions, Unique Constraints, Indexed Lookups)          │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 20.19+** & npm

---

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Copy backend/.env.example to backend/.env and set a local SECRET_KEY
# (or use the development defaults for a local demo)

# Seed the database with synthetic demo events and users
python -m app.seed

# Run automated tests against an isolated in-memory database
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

After running the seed command, use the **1-Click Quick Demo Switcher** in the top navigation bar or log in manually:

| Role | Username | Password | Purpose |
|---|---|---|---|
| **Organizer** | `organizer1` | `password123` | Create events, manage RSVP roster, broadcast announcements |
| **Organizer** | `organizer2` | `password123` | Multi-tenant organizer with separate events |
| **Attendee** | `attendee1` | `password123` | Submit RSVPs, view digital ticket pass, receive alerts |
| **Attendee** | `attendee2` | `password123` | Test waitlist promotion & multi-user concurrent RSVP |
| **Platform Admin** | `admin` | `admin123` | Global system oversight, audit logs, all event operations |

These are synthetic development accounts only. Do not seed demo accounts or reuse these passwords in a production deployment. Public self-registration creates attendee accounts; organizer and admin accounts must be provisioned by a trusted operator.

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

The backend test suite in `backend/tests/test_api.py` covers:
1. User registration, duplicate username/email rejection
2. Public registration role restrictions, role-based authorization, and permissions
3. Event CRUD lifecycles
4. Capacity enforcement including additional guests
5. Atomic waitlist queue placement and automatic promotions
6. Real-time announcement broadcasts & notifications
7. Health checks and analytics aggregations
8. Isolated in-memory test database (the configured development or production database is not modified)

```bash
cd backend
python -m pytest tests/test_api.py -v
```

---

## ☁️ Cloud Deployment

The backend is packaged as a container and supports managed PostgreSQL through SQLAlchemy/asyncpg. The included `backend/Dockerfile` can be deployed to a container platform; host the React `frontend/dist` output on a static hosting service or CDN.

1. Provision a persistent PostgreSQL database and a backend container service. Build the container from the repository root with `docker build -t event-rsvp-api ./backend`.
2. Set backend environment variables in the hosting provider's secret/configuration panel:
   - `APP_ENV=production`
   - `DEBUG=false`
   - `SECRET_KEY` to a newly generated random value of at least 32 characters (generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`)
   - `DATABASE_URL` to the provider's PostgreSQL URL (`postgres://` and `postgresql://` URLs are normalized to `postgresql+asyncpg://`; `sslmode` query options are adapted for asyncpg)
   - `FRONTEND_URL` to the deployed frontend origin, or `CORS_ORIGINS` to a comma-separated allow-list
3. Build the frontend with `VITE_API_URL=https://<api-host>/api` and `VITE_WS_URL=wss://<api-host>`, then deploy the generated `frontend/dist` directory. Use HTTPS/WSS endpoints.
4. Verify the backend at `https://<api-host>/api/health`, then test login, event creation, RSVP changes, and WebSocket updates from the hosted frontend.

For local `.env` files, start from `backend/.env.example` and `frontend/.env.example`. Never commit real credentials or use the demo seed accounts in production.

**Production limitations:** SQLite is for local development; use PostgreSQL for persistent cloud data and row-lock-based capacity serialization. The WebSocket connection manager is process-local, so deploy one backend instance unless a shared pub/sub layer (for example Redis) is added. Startup currently creates missing tables but does not migrate existing schemas; use a migration tool before evolving a production database. WebSocket bearer tokens are passed in the connection URL because browser WebSocket APIs cannot set authorization headers; configure access-log redaction for query strings and use short-lived tokens for public deployments.

See [the project report](./docs/PROJECT_REPORT.md), [the evidence checklist](./docs/PROOF_CHECKLIST.md), and [portfolio copy](./docs/PORTFOLIO_COPY.md) for course-report and demonstration guidance.

---

## 💼 Cloud Computing Interview Defense & Q&A

1. **How does the system prevent overbooking under high traffic spikes?**
   - *Answer:* In PostgreSQL, the backend locks the event row while it checks confirmed headcount and writes the RSVP. This serializes reservations for that event, and a unique constraint on `(event_id, user_id)` prevents duplicate RSVPs. SQLite is only the local development option and is not the production concurrency guarantee.
2. **How does real-time syncing function across distributed clients?**
   - *Answer:* An in-process WebSocket connection manager maintains event-specific channels. RSVP and event changes are pushed to connected clients without polling. Multiple backend instances need a shared broker such as Redis to share these broadcasts.
3. **How would you scale this architecture to millions of users on AWS/GCP?**
   - *Answer:* Deploy FastAPI on containerized auto-scaling services (AWS ECS/Fargate or GCP Cloud Run), use AWS RDS PostgreSQL or Cloud Spanner for managed ACID persistence, Redis Pub/Sub or Redis Streams as the distributed message broker for WebSockets across multiple server instances, and CloudFront/Cloud CDN for static frontend assets.
4. **Why does the application use both REST and WebSockets?**
   - *Answer:* REST is used for durable request/response operations such as authentication, event CRUD, and RSVP submission. WebSockets push updates after committed changes so connected dashboards do not have to poll.
5. **How are attendee passwords protected?**
   - *Answer:* Passwords are hashed with bcrypt and are never stored as plaintext. JWTs authenticate API and WebSocket connections; production deployments must use a strong secret supplied through the hosting platform's secret manager.
6. **How are organizer permissions enforced?**
   - *Answer:* The backend checks the authenticated account's role and event ownership for protected operations. Public sign-up is restricted to attendee accounts so a user cannot self-assign organizer or admin privileges.
7. **What happens when an event reaches capacity?**
   - *Answer:* The backend counts each Going RSVP plus its additional guests. Requests that do not fit are added to the waitlist, and a released seat can promote the next waiting attendee.
8. **What is the purpose of the waitlist?**
   - *Answer:* It records attendees in queue order when capacity is exhausted. When a confirmed attendee cancels or changes their response, the backend promotes the next eligible person and notifies them.
9. **How is the project tested safely?**
   - *Answer:* The API tests use a separate in-memory SQLite database and cover registration, authorization, event/RSVP workflows, capacity, notifications, analytics, and health checks. Running tests does not drop or modify the configured application database.
10. **What must change before deploying multiple application instances?**
    - *Answer:* The in-memory WebSocket manager must be replaced or extended with a shared pub/sub system, and production schema changes should be handled through migrations. The service should use managed PostgreSQL and secrets from the cloud provider.

---

## 📄 License
MIT License. Built for Cloud Computing Course Project & Portfolio Proof of Work.
