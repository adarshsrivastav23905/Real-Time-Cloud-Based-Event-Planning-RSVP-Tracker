# Event Planning and RSVP Tracker Frontend

The frontend is a React single-page application built with Vite. It provides
attendee and organizer workflows for event discovery, RSVP management,
announcements, check-in, and analytics. The FastAPI backend must be running for
authenticated and data-backed features to work.

## Requirements


## Run Locally

From this directory, install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. By default, API requests use
`http://localhost:8000/api`. Set `VITE_API_URL` when the backend is hosted at a
different URL.

## Quality Checks

```bash
npm run lint
npm run build
```

For backend setup, demo accounts, and full-stack instructions, see the
[project README](../README.md).
