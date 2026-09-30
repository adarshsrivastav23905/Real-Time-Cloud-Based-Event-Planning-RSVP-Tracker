# Portfolio and Interview Copy

Adapt these drafts to match work you have personally completed. Do not claim a
cloud deployment until one has been performed and verified.

## Resume Bullets

- Built a full-stack event planning and RSVP platform using React, FastAPI, and
  SQLAlchemy, with JWT authentication, role-based authorization, event
  management, announcements, notifications, check-in, and analytics.
- Implemented PostgreSQL row-lock capacity checks that account for guest
  headcount, database-enforced RSVP uniqueness, and waitlist promotion, with
  WebSocket updates for connected clients.
- Added a Dockerized backend, environment-based PostgreSQL/CORS configuration,
  production secret checks, and 23 asynchronous API tests using an isolated
  in-memory database.

## Two-Line Project Description

Real-Time Cloud-Based Event Planning & RSVP Tracker is a React and FastAPI
application for event publishing, attendee responses, capacity management,
live updates, notifications, and attendance analytics.
It is locally runnable with SQLite and prepared for deployment with a
containerized API and managed PostgreSQL.

## LinkedIn Description

I built a cloud-oriented event planning and RSVP tracker to explore full-stack
application design and cloud computing concepts. The system uses a React
frontend, FastAPI REST API, SQLAlchemy persistence, JWT authentication, and
WebSockets for live event updates. Organizers can manage events, announcements,
attendee check-in, and analytics; attendees can discover events and maintain
their RSVP. Capacity checks account for additional guests, and PostgreSQL
row-level locking is used to serialize reservations in a production database.

The repository includes local setup instructions, an API test suite with an
isolated in-memory database, production configuration guardrails, a backend
Dockerfile, and cloud deployment guidance. The application is not represented
as live-deployed unless a real deployment URL and evidence are added.

## Technical Skills Demonstrated

- React, JavaScript, Vite, responsive web application development
- Python, FastAPI, REST API design, Pydantic validation
- SQLAlchemy async, relational modeling, SQLite, PostgreSQL
- JWT, bcrypt, role-based access control
- WebSockets and event-driven client updates
- Transactional capacity management and uniqueness constraints
- Docker, environment configuration, cloud deployment preparation
- pytest, HTTPX, isolated API testing

## Repository Description

Cloud-oriented event planning and RSVP tracker built with React, FastAPI,
SQLAlchemy, JWT authentication, PostgreSQL-ready configuration, WebSockets,
capacity-aware RSVP/waitlist workflows, notifications, check-in, analytics,
automated API tests, and Docker deployment guidance.
