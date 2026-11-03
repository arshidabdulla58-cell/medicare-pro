# MediCare Pro — Architecture

## Proposed repository layout

Use a TypeScript monorepo with `client/` and `server/` applications plus shared API contracts where practical. Keep the client and server independently buildable and deployable. Shared packages should contain only stable, environment-neutral contracts (DTO schemas/enums); never share server models, secrets, or database code with the browser.

```text
client/                 React + Vite application
  src/app/              router, providers, query client
  src/components/       UI primitives, layout, common states
  src/features/         auth, patients, appointments, etc.
  src/pages/            public and role landing pages
  src/services/         typed HTTP client and API functions
  src/store/            small client-only Zustand state
server/
  src/config/           env parsing, database, logger
  src/middleware/       auth, permissions, validation, errors, rate limits
  src/modules/          domain modules (routes/controllers/services/models)
  src/sockets/          authenticated Socket.IO setup and event delivery
  src/utils/            shared server utilities
packages/contracts/     shared DTO types/schemas if monorepo tooling supports it
docs/                    operational/API documentation as the project grows
```

Stage 2 should choose and pin compatible stable dependencies after checking current package support, Node versions, and deployment constraints. The requested stack is the default: React, Vite, TypeScript, Tailwind, shadcn/ui, React Router, TanStack Query, Zustand, RHF/Zod, Recharts, Axios, Motion, Lucide; Node/Express/TypeScript, MongoDB/Mongoose, JWT session tokens, bcrypt, Socket.IO, Multer, Helmet, CORS, rate limiting, and structured logging. Do not add React Bits as a runtime dependency unless a specific maintained component/effect is selected; reproduce small effects with CSS/Motion when that is simpler and accessible.

## Runtime architecture

```text
Browser (React SPA)
  ├── HTTPS /api/v1 ──> Express API ──> domain services ──> MongoDB
  ├── authenticated Socket.IO ────────> notification service / MongoDB
  └── private file URLs ──────────────> configured object storage (optional)
```

The server is the system of record. The browser uses TanStack Query for remote state and cache invalidation, Zustand only for transient UI state, React Hook Form/Zod for forms, and a shared Axios client for API calls. Use lazy route loading and role-aware route guards for usability, but repeat all authorization on the server.

## Backend module boundary

Each domain module owns routes, request validators, controller adapters, service/business rules, models, and module types. Cross-module actions go through exported service interfaces rather than importing another module's controllers or reaching into its models indiscriminately. A central error handler maps typed application errors to a consistent response and logs diagnostic details without returning stack traces or sensitive fields.

Recommended first modules: auth/users, departments, doctors, patients, appointments, audit, notifications. Add clinical records and prescriptions next, then lab, pharmacy, billing, admissions/beds, analytics, and optional AI. Analytics should aggregate server-side with appropriate access rules and date limits.

## Authentication and authorization

- Passwords: bcrypt with calibrated work factor; validate password policy and avoid leaking account existence during login/reset.
- Access token: short-lived JWT held in memory by the browser; include user ID, session/token version, and minimal claims. Do not place sensitive clinical details in claims.
- Refresh token: rotating random secret in a Secure, HttpOnly, SameSite cookie; store only a cryptographic hash and session metadata. Detect reuse and revoke the token family. Provide logout/revocation and password-change invalidation.
- Cookie-authenticated refresh/logout endpoints need CSRF/origin protections. CORS allowlist must be explicit. TLS is mandatory in deployment.
- Login, registration, password reset, and refresh endpoints need rate limits and abuse controls. Use generic errors and audit security events.
- Authorization combines role permissions, object ownership, assigned-care/department relationships, state transitions, and field-level write restrictions. All sensitive record queries should be scoped in the service/database query itself.
- Audit access to high-sensitivity records and changes, with actor, action, resource, timestamp, request ID, and bounded metadata. Never log passwords, token values, file contents, or unnecessary clinical payloads.

## API and error conventions

Base path `/api/v1`. JSON responses use a stable envelope: successful reads/mutations include `data` and optional `meta`; errors include a machine-readable `error.code`, safe `message`, optional field issues, and `requestId`. Use HTTP status codes consistently. List endpoints are paginated and return `items` plus cursor/page metadata. Mutations validate input with Zod and use allowlisted field mapping to prevent mass assignment.

## Data consistency and concurrency

- Set MongoDB replica set mode in local Docker/deployment for transactions.
- Use unique indexes for identifiers and booking collision keys. Appointment slot reservation should be atomic and based on a normalized slot key or a guarded transaction; do not rely on a prior availability read alone.
- Dispensing decrements a specific unexpired batch only when sufficient stock remains, and writes the transaction/audit record in the same transaction.
- Admission/transfer reserves an available bed and releases the previous bed atomically.
- Payment callbacks and client retries must be idempotent; never mark an invoice paid solely from an unverified browser action.
- For deployments without transaction support, disable the affected workflow or implement and document a durable compensation/outbox pattern; do not imply atomicity.

## Realtime and background work

Socket.IO uses the same authenticated identity and authorization policies as HTTP. Persist notifications before emitting; socket events only signal clients to refetch authorized data. Rooms are scoped to user or permitted operational groups, and clients cannot join arbitrary rooms. Define an outbox/retry mechanism before relying on events for durable business work. Reminders require a scheduler/queue and configured delivery provider; the app must show delivery state/failure, not claim delivery when unconfigured.

## File handling

Multer should enforce strict file size/count and extension/MIME allowlists, then content validation. Store private files outside the web root, preferably object storage with encryption and short-lived authorized download links. Persist metadata and access audit information, not public paths. Production should define malware scanning and retention policy. Local development may use a private local upload adapter with the same interface.

## Frontend experience

Use a calm clinical palette, consistent spacing/type scale, semantic HTML, keyboard-accessible dialogs/tables/forms, visible focus, sufficient contrast, and `prefers-reduced-motion`. Motion effects should be short and nonessential. Every asynchronous view needs loading, empty, error, and retry states. Mobile navigation should use an accessible drawer. Charts need labels and a useful tabular/text equivalent.

## Observability and deployment

Use structured Pino logs with request IDs, redaction, and environment-specific levels. Add `/health/live` and `/health/ready`; readiness checks database connectivity without exposing internals. Deployment targets may be Vercel for static frontend, Render/AWS for API, MongoDB Atlas, and S3-compatible private file storage. Configure TLS, secrets, backups, restore tests, alerting, and retention outside application code. Docker Compose is suitable for local frontend/API/Mongo replica set development; production containers should run as non-root with minimal images.

## Key tradeoffs

- A modular monolith is simpler to build, explain, and deploy for a portfolio than microservices while keeping domain boundaries clear.
- MongoDB suits the requested stack and document records, but cross-domain accounting/inventory consistency is harder than in a relational database; transactions, immutable ledgers, and careful constraints are required.
- The broad role list creates policy complexity. A permission matrix and object-level tests are mandatory before exposing sensitive endpoints.
- Socket.IO improves timely updates but is not a source of truth; persisted state and refetchable APIs remain authoritative.

