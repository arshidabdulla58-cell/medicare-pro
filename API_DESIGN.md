# MediCare Pro — API Design

## Conventions

- Base URL: `/api/v1`; JSON over HTTPS.
- Authentication: short-lived bearer access token; rotating refresh token in HttpOnly cookie.
- Success: `{ "data": ..., "meta": { ... } }` (meta omitted when unnecessary).
- Error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "issues": [...] }, "requestId": "..." }`.
- Lists accept bounded `limit`, cursor or page parameters, allowlisted `sort`, and validated filters. Responses return `items` and pagination metadata.
- Mutating requests validate schemas, allowlist writable fields, enforce authorization in the service, and write audit events. Use `Idempotency-Key` for payment and other retry-prone commands.
- Dates use ISO 8601 UTC. Money is represented as integer minor units plus currency.
- Use `ETag`/`If-Match` or version fields for concurrent edits to mutable administrative resources where stale writes matter.

## Endpoint map

### Public and authentication

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET /public/departments` | Public department directory | Public |
| `GET /public/doctors` | Public active doctor directory | Public |
| `POST /public/contact` | Store a general, appointment, or feedback enquiry | Public, strict validation, rate limited |
| `POST /auth/register` | Patient self-registration | Public, throttled |
| `POST /auth/login` | Create session and access token | Public, throttled |
| `POST /auth/refresh` | Rotate refresh session | Refresh cookie + CSRF/origin check |
| `POST /auth/logout` | Revoke current refresh family | Authenticated |
| `POST /auth/forgot-password` | Start generic reset flow | Public, throttled |
| `POST /auth/reset-password` | Set password from one-time token | Public, throttled |
| `GET /auth/me` | Current user and safe permissions | Authenticated |

### Users, departments, staff

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET/POST /users` | Search/create staff accounts | Super-admin/admin, scoped |
| `GET/PATCH /users/:id` | Read/update staff account | Admin or self-limited; permission checks |
| `GET/POST /departments` | Paginated list/create departments | Authenticated staff list; admin mutations |
| `PATCH /departments/:id` | Update department | Admin |
| `GET/POST /doctors` | Paginated search/create doctor profiles | Authenticated clinical/reception staff list; admin create |
| `PATCH /doctors/:id` | Update doctor profile | Admin |
| `GET /doctors/:id/availability?from=&to=` | Available slots | Authenticated/public-safe view |

### Patients and scheduling

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET/POST /patients` | Paginated search/register patient | Authorized clinical/reception staff; patient list is self-only; self-registration uses auth endpoint |
| `GET/PATCH /patients/:id` | Demographics/profile | Authorized staff; patient read is self-limited; profile edits restricted to admin/reception |
| `GET /patients/:id/appointments` | Appointment history | Patient self or authorized care staff |
| `GET /appointments` | Filtered schedule/list | Role- and assignment-scoped |
| `POST /appointments` | Book/reserve slot | Patient or authorized receptionist |
| `GET /appointments/:id` | Appointment detail | Related patient or authorized staff |
| `PATCH /appointments/:id` | Change allowed fields/state | Policy and transition checks |
| `POST /appointments/:id/cancel` | Cancel with reason | Related patient or authorized staff |
| `POST /appointments/:id/reschedule` | Atomic replacement slot | Related patient or authorized staff |
| `POST /appointments/:id/check-in` | Check in | Receptionist/admin |

Availability is advisory. Booking rechecks and reserves the slot atomically. Do not expose another patient's identity while showing availability.

#### Scheduling implementation status

The current appointment implementation exposes `GET /appointments?page=&limit=&status=`, `GET /appointments/availability?doctorId=&days=`, `POST /appointments`, and `PATCH /appointments/:id/status`. Availability accepts a 1–31 day horizon and returns open 30-minute slots from a doctor's weekly schedule in the doctor's configured IANA time zone; it does not disclose other patients. Staff and patients select from these server-provided slots. Create accepts a tenant-local patient (staff booking) or resolves the signed-in patient's linked profile (patient self-booking), a doctor profile, an ISO timestamp, and an optional general reason. The server revalidates schedule and slot policy, then a MongoDB transaction inserts both the appointment and a uniquely indexed doctor-slot reservation; a duplicate reservation returns `409 APPOINTMENT_SLOT_TAKEN`. Cancellation updates appointment state and releases that reservation in one transaction. Staff lists are limited to administrators and receptionists; patient lists and state changes are scoped to the caller's linked patient profile. Doctor-user linking/assigned clinician access, rescheduling, detail, check-in endpoint aliases, calendar UI, and reminder delivery are not implemented yet.

### Clinical records, prescriptions, laboratory

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET/POST /patients/:id/medical-records` | Read/create encounter records | Authorized care team; clinician creates |
| `POST /medical-records/:id/amendments` | Append correction | Authorized clinician, reason required |
| `GET/POST /patients/:id/prescriptions` | History/create prescription | Patient read own; clinician create |
| `GET /prescriptions/:id/pdf` | Render/download prescription | Patient owner or authorized staff |
| `GET/POST /lab-tests` | Search/create test requests | Authorized clinician/staff |
| `GET/PATCH /lab-tests/:id` | Read/update test workflow | Assigned technician and authorized staff |
| `POST /lab-tests/:id/reports` | Submit result draft | Assigned lab technician |
| `POST /lab-reports/:id/review` | Review result | Authorized reviewer |
| `POST /lab-reports/:id/release` | Release result | Authorized releaser; audited |
| `GET /patients/:id/lab-reports` | Released result history | Patient owner or authorized care team |

Patient-facing access defaults to released results only. Record access is checked against care relationship and purpose policy.

### Pharmacy and inventory

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET/POST /medicines` | Search/create catalog | Staff; admin/pharmacist writes |
| `GET/PATCH /medicines/:id` | Catalog details/update | Admin/pharmacist |
| `GET/POST /medicine-batches` | View/receive stock batches | Pharmacist; receive admin-authorized |
| `GET /pharmacy/alerts` | Low stock/expiry alerts | Pharmacist/admin |
| `GET /prescriptions/queue` | Pending dispensing queue | Pharmacist |
| `POST /prescriptions/:id/dispense` | Dispense against available batches | Pharmacist; idempotent/transactional |
| `POST /inventory/adjustments` | Correct stock with reason | Authorized pharmacist/admin; audited |
| `GET /pharmacy/transactions` | Inventory ledger/report | Pharmacist/admin |

### Billing and admissions

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET/POST /invoices` | Search/create invoice | Admin/billing-authorized staff |
| `GET /invoices/:id` | Invoice detail | Patient owner or authorized staff |
| `POST /invoices/:id/line-items` | Add authorized charge | Billing permission; not after finalization without adjustment flow |
| `POST /invoices/:id/discounts` | Apply authorized discount | Elevated billing permission and reason |
| `POST /invoices/:id/payments` | Record offline/demo payment | Billing-authorized staff; idempotent |
| `POST /payments/provider-webhook` | Verify provider event | Provider signature; no browser trust |
| `GET/POST /wards` | Ward list/create | Staff/admin writes |
| `GET/POST /beds` | Bed list/create | Staff/admin writes |
| `POST /admissions` | Admit and allocate bed | Authorized staff; transactional |
| `POST /admissions/:id/transfers` | Move to available bed | Authorized staff; transactional |
| `POST /admissions/:id/discharge` | Discharge/release bed | Authorized staff; transactional |

### Dashboard, notifications, files, audit

Implemented: `GET /analytics/activity?page=1` returns ten recent audit event summaries per page (action, resource type, timestamp, and event ID). Access is restricted to administrators in the event's hospital; metadata and actor/resource identifiers are excluded.

| Method/path | Purpose | Access |
| --- | --- | --- |
| `GET /analytics/dashboard` | Role-specific cards and trends | Authenticated, role-scoped |
| `GET /analytics/appointments` | Bounded date-series | Admin/authorized staff |
| `GET /analytics/revenue` | Revenue aggregates | Admin/billing permission |
| `GET /notifications` | Current user's notifications | Authenticated, own only |
| `POST /notifications/:id/read` | Mark own notification read | Authenticated, own only |
| `POST /files` | Upload validated attachment | Authorized resource context |
| `GET /files/:id/download` | Issue private download/stream | Resource authorization each time |
| `GET /audit-logs` | Search audit trail | Super-admin/admin permission; scoped |
| `GET /health/live`, `/health/ready` | Liveness/readiness checks | Health probes, minimal output |

`GET /analytics/dashboard?days=30` accepts a bounded 7–90 day range and is restricted to super-admin/admin. It returns hospital-scoped active patient/doctor/department counts, today's non-cancelled appointments, future pending appointments, a UTC daily appointment series, active doctor counts by department, and up to six upcoming appointment summaries. It does not include billing or revenue figures because billing records are not implemented.

## Workflow state rules

- Appointments: `PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED`; cancellation and no-show are controlled terminal transitions. Reschedule creates an audited slot change and releases/reserves atomically.
- Lab test: `REQUESTED → SAMPLE_COLLECTED → PROCESSING → COMPLETED`; cancellation requires a valid prior state/reason. A completed test is not automatically released: its report follows draft/review/release permissions.
- Prescription: issued, partially dispensed (if supported), dispensed, cancelled. Only an authorized clinician issues; only a pharmacist dispenses; issued lines are immutable and changes require a replacement/cancellation workflow.
- Invoice/payment: draft/finalized/partially-paid/paid/voided or overdue derived from due date. Corrections use credit/adjustment records. Provider callbacks are signature-verified and idempotent.
- Admission: requested/admitted/discharged/cancelled; bed occupancy changes in the same transaction.

Reject invalid transitions with `409 STATE_CONFLICT`, stale version with `409 VERSION_CONFLICT`, unavailable slot/bed/stock with `409 RESOURCE_UNAVAILABLE`, and failed validation with `422 VALIDATION_ERROR` (or consistently use 400 if chosen at setup).

## Socket.IO events

Implemented appointment notifications: `GET /notifications?page=1` returns the signed-in user's persisted inbox (ten per page), total and unread counts; `POST /notifications/:id/read` marks only an owned notification as read. Booking and status updates write notifications within their MongoDB transaction for patients with linked accounts. Socket.IO authenticates an access token, assigns the server-selected hospital/user room, disconnects on token expiry, and emits a payload-free `notification.created` signal after commit. The patient bell refetches on reconnect and polls every 30 seconds to recover missed signals. No email, SMS, scheduled reminders, or retrospective notifications are sent.

Authenticate the connection with the same session identity; authorize room membership server-side. Persist notification/event intent first. Emit minimal hints such as `notification.created`, `appointment.updated`, `lab-report.released`, and `inventory.alert`; clients refetch via REST. Avoid PHI in event names, room IDs, and payload previews. Reconnect logic must recover by fetching persisted notifications and current resources.

## API documentation and compatibility

Publish an OpenAPI specification generated from route schemas where feasible. Include examples with synthetic values, role requirements, state diagrams, pagination, error codes, and idempotency behavior. Introduce breaking changes only with an API version strategy; `/api/v1` is the initial contract.

