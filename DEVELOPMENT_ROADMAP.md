# MediCare Pro — Development Roadmap

This roadmap makes each phase reviewable. Stage 1 is complete when the four planning documents are accepted. The user approved moving into Stage 2. Report each stage's outcome and continue with the next planned stage unless a genuine blocker requires a decision.

## Stage 1 — Analyze and plan (complete)

**Work:** inspect the repository; record assumptions and risks; design architecture, database, API, and ordered delivery.

**Deliverables:** `PROJECT_PLAN.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `API_DESIGN.md`, this roadmap.

**Exit evidence:** repository findings and open decisions are stated; no app implementation was claimed. The user approved Stage 2.

## Stage 2 — Project foundation

**Work:** initialize monorepo and Git workflow; configure React/Vite/TypeScript/Tailwind and Express/TypeScript; lint/format; environment parsing; Mongo replica-set local setup; centralized logging/errors; Docker development; CI checks; health endpoints; safe `.env.example` files.

**Exit evidence:** clean install, typecheck, lint, unit baseline, client/server production builds, local services start, readiness behavior verified, secrets excluded from version control, setup documented.

**Stage 2 implementation status (2026-11-03):** package workspaces, TypeScript, Tailwind, ESLint 10, Prettier, Zod configuration parsing, Pino logging, API error handling, health endpoints, Docker Compose MongoDB replica-set configuration, CI, environment examples, and setup documentation are implemented. A development-only MongoDB 8 replica-set runner now stores data under ignored `server/.local-mongodb`, so Docker is optional. Live readiness was verified. The latest `npm run check` passed (typecheck, lint, 29 automated tests, and client/server production builds). The local database is for synthetic development data; production database provisioning remains outstanding.

## Stage 3 — Design system and public website

**Work:** typography/color/tokens, accessible reusable components, responsive marketing shell, Home/About/Departments/Doctors/Services/Contact, public data endpoints for directory content, reduced-motion support, and a persisted general/appointment enquiry form. Login/register/forgot-password screens ship with their working authentication flows in Stage 4. Testimonials must be explicitly labeled fictional demo content or omitted.

**Exit evidence:** pages work at mobile/tablet/desktop widths, keyboard and reduced-motion review, form validation and API error states, public builds and browser walkthrough recorded.

**Stage 3 progress:** public pages, real directory API reads, persistent contact request handling, accessible mobile navigation, generated Inter font assets, reduced-motion handling, and route-level code splitting are implemented. Browser checks covered the homepage, contact form, mobile navigation, and auth registration validation. The database-backed public directory and contact flows now have a running local database available; broader visual and responsive review remains part of quality work.

## Stage 4 — Identity, sessions, RBAC, audit

**Work:** patient registration, staff provisioning, login/refresh rotation/logout, reset flow, account throttling, authorization middleware/policies, permission matrix, audit model, profile and role-based navigation.

**Exit evidence:** positive and negative auth/permission tests, refresh reuse/revocation coverage, cookie/CORS/CSRF settings reviewed, no secret exposure in responses/logs.

**Stage 4 progress (2026-11-03):** patient self-registration, login, rotating refresh sessions, logout, password reset delivery configuration, account throttling, authentication/role middleware, bootstrap-admin script, and public auth forms are implemented. Live synthetic-data checks against the local replica set verified register, authenticated profile read, refresh rotation, logout, and super-admin login. Automated tests cover validation, role rejection on self-registration, malformed login handling, origin rejection, and health/contact paths. Reset email delivery still needs SMTP configuration; refresh-family reuse needs dedicated automated coverage. RBAC middleware exists; most business modules and their role-specific pages do not yet exist.

## Stage 5 — Core operations

### Slice A: departments, doctors, patients

Directory management, patient registration/profile/search, pagination, emergency contact/allergy data, safe profile views and patient IDs.

**Slice A progress (2026-11-03):** tenant-scoped department and doctor list/create/update routes and patient list/create/detail/update routes are implemented with bounded pagination, field validation, role gates, and audit events for writes and profile reads. Patient list responses omit sensitive profile fields; patient self reads are restricted by linked account. The profile model supports optional account links, date of birth, gender, blood group, allergies, and emergency contact. The staff workspace lists, creates, and edits patient administrative details and doctor/department directory profiles against live APIs; patient administrative update fields are restricted so that receptionist/admin edits cannot alter clinical profile data through that route. Edit interaction coverage was added. Doctor-user linking, medical history/appointment tabs, integration tests against MongoDB, and deeper access-boundary testing remain outstanding; this slice is not complete.

### Slice B: appointments

Doctor schedules, slot availability, atomic booking, cancellation/reschedule/check-in/status transitions, list/calendar views, reminders only when a real provider/scheduler exists.

**Slice B progress (2026-11-03):** persisted appointment and unique slot-lock models, tenant-scoped list/create/status routes, configurable weekly doctor hours in an IANA time zone, an availability endpoint that returns open 30-minute slots, server-side schedule revalidation, transaction-backed double-booking prevention, cancellation with atomic slot release, transactionally written audit events, and slot-based booking controls for staff and patients are implemented. Patient accounts can see staff-created bookings for their linked profile, with a one-minute refresh and focus refetch, and may cancel eligible bookings or self-book. Integration tests against a MongoDB replica set verified concurrent same-slot booking yields one success and one conflict, availability removes reserved slots, cancelled slots can be booked again, and patients cannot view or cancel another patient's appointment. Doctor-to-user account linking and assigned-only clinician views, rescheduling, calendar UI, reminder delivery, hospital-wide timezone policy, and deeper permission tests remain outstanding; this slice is not complete.

### Slice C: dashboards

Role-specific real aggregates, date filters, accessible charts, recent activity and notifications.

**Activity feed update:** admin/super-admin dashboards now include a persisted audit activity feed with ten events per page, automatic refresh, loading/error/empty states, and a hospital-scoped API. Responses omit audit metadata and patient identifiers. Integration coverage verifies pagination, tenant isolation, role rejection, and invalid page handling. Notifications and clinical-role dashboards remain outstanding.

**Slice C progress (2026-11-03):** the super-admin/admin workspace now opens to an analytics overview backed by `GET /analytics/dashboard`. Hospital-scoped active patient, doctor, and department totals, today's appointments, future pending appointments, a selectable 7/30/90-day appointment trend, doctors by department, and upcoming visit summaries are live. Endpoint integration tests cover tenant isolation and role/range validation. Revenue, full staff activity feed, notifications, and dashboards for clinical roles remain outstanding until their underlying workflows exist; the slice is not complete. Latest `npm run check` passed with 29 automated tests and client/server production builds.

**Exit evidence per slice:** API integration tests including access boundaries and concurrency; UI browser walkthrough; empty/loading/error states; relevant checks/builds.

## Stage 6 — Clinical workflows

**Work:** clinician-authored medical records and amendments; vitals; prescriptions; patient history views; printable/PDF prescription; pharmacist workflow begins from issued prescription. Maintain clinical authorship and avoid AI-generated orders.

**Exit evidence:** immutable author history, field-level permissions, patient read scope, validation, audit, PDF content and access checks verified.

## Stage 7 — Laboratory, pharmacy, billing, admissions

Deliver vertical slices in order:

1. Lab requests, assignment, specimen/status transitions, draft/review/release reports and private attachments.
2. Medicine catalog, batches, expiry/low-stock alerts, receipts, dispensing, adjustments, immutable ledger.
3. Invoice lines/discount authorization/tax configuration, manual or sandbox payment recording, invoice PDF/history.
4. Wards/beds, admission, transfer, discharge, availability views.

**Exit evidence:** transaction and idempotency tests; race/negative-stock/occupied-bed/payment replay cases; role tests; generated documents reviewed; browser flows demonstrated.

## Stage 8 — Realtime and optional AI

**Appointment notification progress:** persisted patient inbox, unread bell, paging, mark-as-read, and authenticated Socket.IO updates are implemented. Notifications are written atomically with bookings/status changes and scoped to linked patient accounts. Reconnect/refetch and periodic polling recover missed events. Other notification types, scheduled reminders, and a durable event delivery worker remain outstanding.

**Realtime work:** persist notifications and outbox, authenticated Socket.IO, authorized rooms, reconnect/refetch behavior, optional scheduled reminders and provider delivery tracking.

**AI work:** feature-flagged administrative assistant and synthetic-data summaries only by default; clear AI labels, prompt/input minimization, consent/authorization checks, human review, timeouts/rate limits, provider key server-only. No autonomous diagnosis or prescription behavior.

**Exit evidence:** realtime reconnect/access tests; provider-offline behavior; AI safety and data-flow review; no PHI sent without approved controls; user-visible failures are honest.

## Stage 9 — Quality, security, performance, deployment docs

**Work:** expand Vitest/RTL/Supertest/Playwright coverage; responsive/accessibility review; dependency/security review; indexes/query profiling; pagination/performance; error boundaries; Docker production profiles; CI; deployment guides for Vercel, Render/AWS, Atlas, and S3-compatible storage; API/database docs; backup/restore notes.

**Exit evidence:** typecheck, lint, relevant unit/integration tests, production builds, browser E2E walkthrough, security checklist results, deployment configuration validation, known limitations documented. Never state the application is bug-free.

## Stage completion report template

For every stage report:

1. What was implemented and what remains explicitly incomplete.
2. Changed files and important design decisions.
3. Commands/checks actually run and results (do not imply unrun checks passed).
4. Known risks, failures, and next-stage prerequisites.

## Suggested portfolio demo path

Use synthetic seeded roles/accounts and demonstrate: receptionist registers a patient and books a slot; doctor reviews assigned schedule and creates a record/prescription; pharmacist dispenses from an available batch; lab technician records and releases a result; patient views released records and invoice; admin reviews real dashboard aggregates and audit activity. Document every demo credential and reset path securely in development docs only.

