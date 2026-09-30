# Demo and Evidence Checklist

Store project screenshots and short recordings in the repository's root
`screenshots/` directory. Use synthetic data, keep the relevant content legible,
hide browser tokens and environment variables, and do not present planned cloud
resources as deployed resources.

## Application Evidence

- [ ] Repository folder structure and README.
- [ ] Architecture diagram showing React, FastAPI, WebSockets, and PostgreSQL.
- [ ] Registration and login pages.
- [ ] Organizer dashboard and analytics charts.
- [ ] Event creation and published event details.
- [ ] Attendee event discovery and event detail view.
- [ ] Going, Maybe, and Not Going responses.
- [ ] Live count update across two browser sessions.
- [ ] Guest count affecting capacity.
- [ ] Full event and waitlist placement.
- [ ] Cancellation and waitlist promotion.
- [ ] Announcement and attendee notification.
- [ ] QR ticket and check-in kiosk.
- [ ] Rejected unauthorized event operation.
- [ ] Backend API test output.
- [ ] API health endpoint and interactive API documentation.

## Cloud Evidence (Only After Deployment)

- [ ] Container service configuration with secrets hidden.
- [ ] Managed PostgreSQL service and backup settings with credentials hidden.
- [ ] Static frontend hosting/CDN configuration.
- [ ] HTTPS frontend and WSS live-update demonstration.
- [ ] Health probe from the deployed API.
- [ ] Cloud logs/monitoring view with private data redacted.
- [ ] Repository URL and actual commit history.

## Suggested Filenames

Use sequential, descriptive names such as `01_repository.png`,
`02_architecture.png`, `03_organizer_dashboard.png`,
`04_live_rsvp_update.mp4`, and `05_api_tests.png`. Do not fabricate screenshots,
deployment evidence, or a multi-day development history.
