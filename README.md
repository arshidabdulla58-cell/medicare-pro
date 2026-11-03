# MediCare Pro

MediCare Pro is a staged hospital management system portfolio project. **Stages 2–3 foundations and the public website are implemented. Stage 4 authentication has passed live synthetic-data checks. Stage 5A directory/patient operations and the first 5B appointment booking slice are in progress.** Staff and patients can book from configured doctor availability; patients can see staff-created appointments for their linked profile and cancel eligible bookings. Rescheduling, clinical records and other hospital workflows are not implemented yet. Do not use this project with real patient data.

## Requirements

- Node.js 24 (the project currently requires Node `>=22.12.0` for Vite 8 compatibility).
- npm 11 or a compatible npm version that supports workspaces.
- Docker Desktop is optional; `npm run dev` starts a local user-space MongoDB replica set.

## Setup

1. Copy `server/.env.example` to `server/.env` and replace `JWT_ACCESS_SECRET` with a random secret of at least 32 characters. `HOSPITAL_ID` is the 24-character ObjectId scope used by local records. Never commit `.env` files.
2. Copy `client/.env.example` to `client/.env` if the API proxy target differs from `http://localhost:4000`. `VITE_` variables are public and must not contain secrets.
3. Install dependencies and start the client, API, and local database:

   ```sh
   npm ci
   npm run dev
   ```

The first run downloads the MongoDB 8.2.6 Windows binary. Database files persist in the ignored `server/.local-mongodb` directory after the dev processes stop. Do not run the Docker MongoDB service at the same time because both bind port 27017.

The client is served at `http://localhost:5173`; the API listens on `http://localhost:4000`. API liveness and readiness endpoints are `/api/v1/health/live` and `/api/v1/health/ready`.

The Vite `/api` proxy forwards requests to the API. In development, both `localhost:5173` and `127.0.0.1:5173` are accepted browser origins. If MongoDB is unavailable, the API still reports liveness, retries its database connection, returns `503 DATABASE_UNAVAILABLE` for database-backed actions, and reports not-ready until the replica set responds. A local `.env` was created for this workspace and is ignored by Git; its generated JWT secret is for local development only.

## Quality commands

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run check` runs TypeScript checks, ESLint, Vitest, and client/server production builds. The current suite has 29 passing automated tests covering the public shell, auth form validation, staff patient creation/edit interaction, patient appointment display/cancellation/self-booking, dashboard data isolation and role/range validation, malformed auth requests, origin checks, database-unavailable behavior, contact validation, health endpoint behavior, and appointment availability, concurrency, timezone validation, cancellation/rebooking, and patient access boundaries against MongoDB replica sets. In addition, local live checks verified patient registration, authenticated profile read, refresh rotation, logout, super-admin login, and real workspace directory reads against the persistent replica set. Full CRUD and workflow coverage is not yet in the automated suite. Password reset delivery additionally needs SMTP configuration.

## Configuration

The server validates configuration with Zod at startup. It requires `MONGODB_URI`, `HOSPITAL_ID`, and `JWT_ACCESS_SECRET`. `server/.env.example` lists the expected server variables. Password reset delivery requires both `SMTP_URL` (`smtp://` with mandatory STARTTLS or `smtps://`) and `EMAIL_FROM`; without them, the endpoint reports that delivery is unavailable. For local-only development, the compose MongoDB service has no authentication; do not expose it to an untrusted network or use that configuration in production.

## Authentication

Patient registration is public; staff accounts are provisioned through the bootstrap flow or later admin workflows. Access tokens are short-lived and kept in client memory. Refresh tokens are rotated and stored hashed on the server, with the raw token held in an HttpOnly cookie. Login and sensitive session endpoints check the configured origin.

Create the first administrative account only after MongoDB is running: set `BOOTSTRAP_ADMIN_FIRST_NAME`, `BOOTSTRAP_ADMIN_LAST_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` in untracked `server/.env`, then run `npm --workspace server run bootstrap:admin`. Remove those bootstrap values immediately afterward. There are no default staff credentials. A synthetic local super-admin was created for this workspace; its credentials were provided in the setup conversation and should be changed before sharing the machine or demo environment.

## Architecture and API

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [API_DESIGN.md](API_DESIGN.md), and [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md). Implemented API routes currently include health checks, public department/doctor directories, public contact requests, authentication, and role-gated department/doctor/patient operations. The staff workspace is available at `/workspace` to administrators and receptionists after sign-in. Other routes in the API design are planned and will be added with their vertical slices.

## Deployment status

Deployment targets and requirements are documented in the architecture and roadmap. Production deployment is not configured. Before any real-world use, define jurisdiction-specific privacy/compliance controls, secure MongoDB access, secret management, backups, object storage, monitoring, and operational incident procedures.
