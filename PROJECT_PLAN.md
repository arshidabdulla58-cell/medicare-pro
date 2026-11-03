# MediCare Pro — Project Plan

## Stage 1 outcome

This document set turns the requested portfolio project into an implementable plan. The workspace was inspected on 2026-11-03 and contains no application files, project instructions, or Git metadata. Therefore this plan is a greenfield proposal and does not assume an existing framework, deployment, database, or design system.

Documents in this set:

- [ARCHITECTURE.md](ARCHITECTURE.md) — application boundaries and technical decisions.
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — collections, relationships, constraints, and indexing.
- [API_DESIGN.md](API_DESIGN.md) — versioned HTTP and realtime contracts.
- [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) — staged implementation and completion gates.

## Product goal

Build a polished, responsive hospital operations platform suitable for a developer portfolio and interview walkthrough. The application should demonstrate coherent workflows across patient administration, scheduling, clinical documentation, pharmacy, laboratory, billing, beds/admissions, and role-aware dashboards. It must distinguish working end-to-end workflows from deferred or unavailable integrations and use synthetic data for demonstrations.

## Stage 1 scope

Analyze requirements, choose a maintainable architecture, document data/API boundaries, identify risks, and sequence delivery. No application implementation, dependency installation, external account setup, or deployment is part of this stage.

## Proposed product boundaries

### Portfolio demonstration release

The first usable release should demonstrate a single hospital tenant and include:

- Public hospital information and account access flows.
- Authentication, refresh sessions, and server-enforced role permissions.
- Staff, department, patient, doctor, and appointment workflows.
- Medical records and prescriptions with authorship and audit history.
- Pharmacy stock and dispensing; lab request and result workflows.
- Invoices and payment recording (manual/demo workflow unless a sandbox provider is explicitly configured).
- Wards, beds, admissions, notifications, dashboards, and operational reports.
- Responsive, accessible UI, synthetic seed data, deployment instructions, and API documentation.

### Explicitly gated capabilities

- Real patient use, regulatory claims, production payment processing, and sending clinical data to third-party AI services are outside the portfolio default. They require separate operational, legal, security, and privacy review for the target jurisdiction and hosting provider.
- AI is limited to optional administrative assistance and human-reviewed summaries. It must not diagnose, issue or approve prescriptions, or make care decisions.
- External integrations (email/SMS reminders, S3-compatible storage, payment provider, AI provider) must degrade cleanly when credentials are absent; no fake success responses.

## Core design principles

1. Enforce authorization and patient-record access in the API and services; frontend visibility is only a usability aid.
2. Keep business rules in domain services, with controllers responsible for transport concerns.
3. Use explicit workflow state transitions, audit events, and idempotency/uniqueness constraints for operations that can be repeated.
4. Use transactions for multi-document changes when MongoDB runs as a replica set; document safe behavior and reject unsupported atomic operations where required.
5. Prefer small, vertical, reviewable increments with a working path through UI, API, persistence, and authorization.
6. Treat accessibility, responsive behavior, reduced motion, validation, loading, empty, and error states as part of each feature.
7. Do not report a feature as complete until its acceptance evidence is recorded.

## User roles and authorization approach

Roles: `SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `NURSE`, `PHARMACIST`, `LAB_TECHNICIAN`, `PATIENT`.

Use role permissions plus resource-level checks. Examples: a patient can read their own released records and invoices; a doctor can read records for patients under an authorized care relationship and author clinical entries; a receptionist can maintain demographics and scheduling but not change clinician-authored notes; a lab technician can process assigned tests but cannot release a result unless granted the review permission. Super-admin activity and sensitive reads/changes are auditable. Define the permission matrix before implementation and cover it with API tests.

## Quality and acceptance gates

For each stage, report changed files, implemented behavior, unresolved issues, and verification performed. Do not claim bug-free status. Before a feature is called complete, record applicable results for type checking, lint, unit/integration tests, production build, and browser verification. The user requested staged approval: stop after Stage 1 and wait for explicit approval before Stage 2.

## Risks requiring active management

| Risk | Why it matters | Planned control |
| --- | --- | --- |
| Broad scope | The requested system spans many products and cannot be delivered safely as one batch | Deliver vertical slices in the roadmap; prioritize an interview-ready core and clearly identify deferred work |
| Healthcare privacy/compliance | Obligations differ by jurisdiction, operator, and deployment | Synthetic data only by default; no compliance claim; review jurisdiction, retention, access, incident, and vendor controls before real use |
| Cross-document consistency | Dispensing, payment, admission, and appointment actions affect multiple records | Transactions on supported MongoDB deployments, unique constraints, idempotency, compensating workflows, and concurrency tests |
| Authorization leakage | UI-only access control can expose sensitive records | Central policy checks, tenant/patient relationship checks, safe query scoping, and negative authorization tests |
| Token/session theft | Long-lived bearer tokens are risky | Short-lived access tokens, rotating refresh sessions in HttpOnly cookies, hashing stored refresh secrets, revocation, CSRF protections where cookie-authenticated mutations require them |
| File upload abuse | Medical documents may contain sensitive data and hostile content | MIME and size allowlists, content checks, private object storage, authorized download URLs, malware scanning policy, and audit events |
| AI privacy and clinical misuse | External processing may disclose sensitive data or imply medical authority | Off by default, synthetic examples, consent/authorization gate, minimization/redaction, human review, no autonomous diagnosis or prescriptions |
| Overstated functionality | Portfolio demos can look complete while workflows are disconnected | Traceable acceptance criteria and no inert controls or simulated successful writes |
| Infrastructure assumptions | Transactions, storage, email, and sockets depend on deployment configuration | Document local and hosted prerequisites and provide explicit health/configuration diagnostics |

## Decisions to confirm before real deployment

The portfolio can proceed with these defaults, but production use needs decisions on jurisdiction and compliance scope, hospital tenancy, data retention/deletion, identity verification, backup/restore objectives, disaster recovery, object storage and malware scanning, email/SMS provider, payment provider, observability, and clinical result release rules. None should be silently inferred from the portfolio brief.

