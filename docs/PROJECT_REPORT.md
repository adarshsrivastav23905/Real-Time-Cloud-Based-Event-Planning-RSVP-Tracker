# Real-Time Cloud-Based Event Planning & RSVP Tracker

## Abstract

This project is a full-stack event management application for organizers and
attendees. It combines a React web client, a FastAPI REST API, a SQL database,
JWT authentication, and WebSockets for live event updates. Organizers publish
events, monitor responses, send announcements, and manage check-in. Attendees
discover events, submit or update Going/Maybe/Not Going responses, and view
their event information. Capacity checks include additional guests, and a
waitlist handles requests that do not fit.

SQLite supports local development and automated tests; PostgreSQL is the
production database target. The application includes a container definition
and deployment guidance, but a live cloud deployment must be created and
verified by the project owner.

## Problem Statement

Small events are often coordinated through spreadsheets and messaging
applications. These methods make it difficult to keep a single attendee list,
avoid duplicate responses, monitor capacity, communicate changes, or provide
current counts to organizers. This project centralizes event data and provides
an API-backed workflow with real-time updates.

## Objectives

- Provide authenticated attendee and organizer experiences.
- Support event creation, updates, publication, and cancellation.
- Collect one RSVP per attendee per event and allow response changes.
- Include plus-ones when reserving capacity.
- Offer ordered waitlisting and promotion when a place becomes available.
- Push event and RSVP changes to connected clients.
- Record announcements, notifications, check-ins, and analytics.
- Demonstrate local development and a deployable cloud-oriented architecture.

## Proposed System and Workflow

1. An attendee or organizer signs in to the React application.
2. An organizer creates and publishes an event through the REST API.
3. Attendees view the event and submit a response and guest count.
4. FastAPI authenticates the request, verifies permissions and deadlines, and
   stores the response in the database.
5. The backend broadcasts updated headcounts and event changes over WebSockets.
6. When capacity is unavailable, the attendee is placed on the waitlist; when
   an attendee cancels or changes their response, the next waiting attendee can
   be promoted.
7. Organizers use the dashboard, announcements, roster, analytics, and
   check-in tools to manage the event.

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React, Vite, React Router | Browser UI and navigation |
| API | FastAPI, Pydantic | REST endpoints and input validation |
| Persistence | SQLAlchemy async, SQLite locally, PostgreSQL in production | Relational event and RSVP data |
| Authentication | JWT, bcrypt | Authenticated sessions and password hashing |
| Real-time | FastAPI WebSockets | Push event counts and notifications |
| Visualization | Recharts | Organizer analytics |
| Ticket display | QR code components | Event ticket/check-in workflow |
| Packaging | Docker | Repeatable backend deployment |

## Architecture

The browser sends JSON requests to the FastAPI API for durable changes. SQL
Alchemy persists users, events, RSVPs, waitlist entries, announcements,
notifications, and audit records. After a committed change, the API broadcasts
to connected WebSocket clients. Static frontend assets can be hosted separately
behind a CDN, while the API and PostgreSQL database run as managed cloud
services.

The current WebSocket manager is process-local. A single API instance supports
the included live-update workflow; a multi-instance deployment needs shared
pub/sub such as Redis. See the root README's deployment section for environment
configuration and production limitations.

## Data Model

- **User**: account identity, bcrypt password hash, role, and active status.
- **Event**: organizer, schedule, venue or online link, capacity, deadline, and
  lifecycle status.
- **RSVP**: one response per `(event_id, user_id)`, response status, guest
  count, and check-in state.
- **Waitlist**: ordered waiting entries with promotion status.
- **Announcement**: organizer-authored event updates.
- **Notification**: user-targeted in-app updates.
- **AuditLog**: record of selected account, event, and RSVP actions.

## Authentication and Security

- Passwords are stored as bcrypt hashes.
- JWTs protect API calls and browser WebSocket connections.
- Public registration is restricted to attendee accounts; organizer and admin
  roles must be provisioned by a trusted operator.
- Organizer actions are checked against the authenticated role and event
  ownership.
- Unique database constraints prevent duplicate accounts and duplicate
  attendee/event RSVPs.
- Production mode requires a strong `SECRET_KEY`, explicit frontend origins,
  and a PostgreSQL URL. Secrets belong in the hosting provider's secret store,
  not in source control.
- Browser WebSocket connections pass the bearer token in the URL because the
  browser WebSocket API does not support custom authorization headers. Cloud
  access logs should redact query strings; short token lifetimes are
  recommended for public deployments.

## Capacity and Concurrency

Going headcount is calculated as one seat per RSVP plus its guest count. In
PostgreSQL, the API locks the event row while it checks capacity and commits a
new or changed RSVP, serializing capacity decisions for that event. The unique
RSVP constraint independently protects against duplicate responses. SQLite is
the local development option and does not provide the production concurrency
guarantee.

## Cloud Computing Concepts Demonstrated

| Concept | Project implementation |
|---|---|
| SaaS | Browser-accessible event management application |
| PaaS / managed services | Deployable API container, managed PostgreSQL, and static frontend hosting |
| Cloud database | Configurable PostgreSQL connection via `DATABASE_URL`; SQLite remains the local option |
| REST | JSON endpoints for auth, events, RSVPs, notifications, and analytics |
| Real-time communication | Authenticated WebSocket channels |
| Authentication and authorization | JWTs, bcrypt, role and ownership checks |
| Scalability | Separate frontend/API/database tiers; Redis pub/sub is the next step for multiple API instances |
| Elasticity and load balancing | Provided by the selected container platform, not configured by this repository |
| CDN | Recommended for hosting the built static frontend |
| Secrets management | Production secrets are supplied as environment variables by the hosting platform |
| Monitoring | `/api/health` is available as a basic health probe; external metrics/logging are not configured |
| High availability and backup | Depend on the selected database and hosting provider; configure their managed backup and availability options |
| CI/CD | Not configured in this repository; add a provider workflow before claiming automated deployment |

## Testing

The backend API suite covers registration and role restrictions, login,
authorization, event creation, RSVP creation and updates, capacity including
guests, waitlisting, cancellation/promotion, announcements, notifications,
analytics, and health checks. It uses a dedicated in-memory SQLite database
and does not modify the configured application database.

Run:

```powershell
cd backend
python -m pytest tests/test_api.py -v
```

## Deployment

The backend Dockerfile and cloud environment variables are documented in the
root [README](../README.md#cloud-deployment). Before production use, create a
managed PostgreSQL database, set a high-entropy signing key and HTTPS frontend
origins, configure WSS, verify backups and logs, and introduce schema
migrations. No live deployment URL is included in this report.

## Limitations and Future Improvements

- There is no email/SMS delivery or invitation-token flow; attendees currently
  need an account to RSVP.
- Reminder scheduling and external push notifications are not implemented.
- The WebSocket manager is in-memory and requires a shared broker for multiple
  API replicas.
- Database startup creates missing tables but does not migrate existing
  schemas; production schema evolution should use Alembic or an equivalent.
- Automated browser, cloud-provider, and large-scale concurrency tests are not
  configured.
- Add CSV invitation import and unique RSVP links, scheduled reminders,
  external delivery, shared WebSocket pub/sub, database migrations, and
  CI/CD as future work.

## Learning Outcomes

The project demonstrates modular frontend/backend development, relational
data modeling, authenticated APIs, role-based authorization, concurrency-aware
capacity management, WebSocket messaging, automated API testing, environment
configuration, and container-based cloud deployment preparation.
