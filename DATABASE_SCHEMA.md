# MediCare Pro — Database Schema

## Conventions

Use Mongoose schemas with strict mode, timestamps, explicit field selection for secrets, DTO serialization that removes internal fields, and ObjectId references. Store times in UTC and render in the user's configured timezone. Store money as integer minor units with an ISO currency code. Soft deletion is limited to entities where history must remain; financial, clinical, audit, and inventory ledger entries are immutable and corrected by append-only amendments/reversals.

Use tenant/hospital scoping from the start (`hospitalId`) even if the first demo has one hospital. This does not make the product fully multi-tenant by itself: every query and unique index must include tenant scope, and cross-tenant access needs explicit tests.

## Collections and key fields

| Collection | Key fields and relationships | Important rules/indexes |
| --- | --- | --- |
| `users` | hospitalId, normalized email, passwordHash, role, status, profileRef, tokenVersion, failedLoginCount, lockUntil | Unique `{hospitalId,email}`; passwordHash excluded by default; role/status indexes |
| `refreshTokens` | userId, tokenHash, familyId, expiresAt, revokedAt, replacedBy, device metadata | Unique tokenHash; TTL on expiresAt only as cleanup (revocation logic remains explicit); user/family indexes |
| `patients` | hospitalId, userId optional, patientNumber, demographics, contacts, emergencyContacts, bloodGroup, allergies, status | Unique `{hospitalId,patientNumber}`; normalized name/contact search indexes; sensitive fields never returned by broad list DTO |
| `doctors` | hospitalId, userId, departmentIds, specialties, qualifications, experienceYears, fee, schedule, status | Unique user link per hospital; department/status index; validate schedule and fee |
| `departments` | hospitalId, name, code, description, status | Unique `{hospitalId,code}` |
| `contactMessages` | hospitalId, reference, name, email, optional phone, topic, message, status | Unique reference; hospital/status/date index; short public retention policy to be decided |
| `doctors` | hospitalId, userId optional, departmentId, specialization, qualifications, experience, consultationFee, status, availabilityTimeZone, weeklyAvailability | Directory and schedule indexes; per-weekday local start/end windows; empty schedule means no self-bookable slots |
| `appointments` | hospitalId, patientId, doctorId, startsAt, endsAt, timeZone, status, reason, createdById | Patient/date and doctor/date indexes; status transition validation; every write audited |
| `appointmentSlots` | hospitalId, doctorId, startsAt, appointmentId | Unique `{hospitalId,doctorId,startsAt}` lock; inserted/released with the appointment in a MongoDB transaction |
| `medicalRecords` | hospitalId, patientId, authorDoctorId, appointmentId optional, symptoms, diagnosis, treatmentNotes, vitals, attachments, amendmentOf | Patient/date and author/date indexes; immutable author/createdAt; amendments append new entry; restricted field reads |
| `prescriptions` | hospitalId, patientId, doctorId, appointmentId, lines (medicine, dose, frequency, duration, instructions), status, issuedAt | Patient/date and status indexes; only clinician authoring; dispensing references transaction; no AI author |
| `medicines` | hospitalId, name, category, strength, form, reorderThreshold, supplier refs/status | Search indexes; inventory quantity derived from batches/ledger rather than trusted duplicated total |
| `medicineBatches` | hospitalId, medicineId, batchNumber, expiryDate, receivedQty, availableQty, unitCost | Unique `{hospitalId,medicineId,batchNumber}`; expiry and medicine indexes; prevent negative availableQty |
| `pharmacyTransactions` | hospitalId, type (RECEIPT/DISPENSE/ADJUSTMENT/REVERSAL), batchId, quantity, prescriptionId, patientId, actorId, occurredAt, reason, idempotencyKey | Immutable; unique idempotency key in tenant; batch/date and prescription indexes |
| `labTests` | hospitalId, patientId, requestedByDoctorId, assignedTechnicianId, testCode, status, priority, requestedAt, specimen metadata | Patient/status, technician/status, requestedAt indexes; state transition validation |
| `labReports` | hospitalId, labTestId, authorId, result fields, attachments, status (DRAFT/REVIEWED/RELEASED), releasedBy, releasedAt | Unique report per test or versioned reports; release authorization; patient/date index |
| `invoices` | hospitalId, patientId, invoiceNumber, lines, subtotal, discount, tax, total, currency, status, dueAt, createdBy | Unique invoice number; patient/date/status indexes; amounts derived and validated server-side |
| `payments` | hospitalId, invoiceId, amount, currency, method, status, providerRef, idempotencyKey, recordedBy, occurredAt | Unique providerRef where present and idempotency key; never store PAN/CVV; append-only adjustments |
| `wards` | hospitalId, name, type, location, status | Unique name/code per hospital |
| `beds` | hospitalId, wardId, bedNumber, status, currentAdmissionId, version | Unique `{hospitalId,wardId,bedNumber}`; status/currentAdmission consistency |
| `admissions` | hospitalId, patientId, bedId, admittedAt, dischargedAt, attendingDoctorId, status, transfers | Patient/status and bed/status indexes; one active admission per patient where policy requires |
| `notifications` | hospitalId, recipientUserId, type, title, body, resourceRef, readAt, createdAt, deliveryState | Recipient/date and unread indexes; content must not reveal unauthorized clinical details |
| `auditLogs` | hospitalId, actorId, action, resourceType, resourceId, requestId, timestamp, limited metadata | Append-only; actor/resource/time indexes; retention policy; no secrets or full clinical bodies |

## Relationship overview

`users` may link to one profile record (`patients` or `doctors`); operational staff are represented by user role and optional department assignment. `appointments` reference a patient, doctor, and department. `medicalRecords` and `prescriptions` reference patient and clinician, with optional appointment linkage. `labTests` reference patient and requesting doctor; `labReports` reference a test. Pharmacy transactions reference batches and optionally prescriptions/patients. Invoices contain line-item snapshots; payments reference invoices. Admissions reference patients and beds; beds point to the current active admission for fast occupancy display. Notifications and audit logs reference the actor/recipient and resource without embedding sensitive documents.

## Modeling and integrity decisions

- Embed bounded, value-like structures such as emergency contacts, vital-sign snapshots, invoice line snapshots, and prescription line items. Reference high-volume or independently managed records such as appointments, reports, batches, and audit entries.
- Use immutable snapshots for invoice lines and issued prescription details so later catalog changes do not rewrite history.
- Preserve clinician-authored records. Corrections create an amendment with author, reason, and link to the original; do not allow general staff or patients to edit the original.
- Patient search should avoid unrestricted regex scans. Use normalized search fields and bounded query parameters; consider Atlas Search only if deployment supports it.
- Prefer cursor pagination for high-volume/chronological data; cap page sizes and sort deterministically.
- Store allergy and vital data with units/structured values and validate ranges only as data-quality guardrails, not diagnostic rules.
- Soft-deleted users/departments are deactivated. Clinical and financial history is retained according to a policy to be decided; hard deletion is not a default.

## Transaction boundaries

1. Appointment booking: verify doctor schedule and policy, atomically reserve the unique slot, then write appointment and audit/notification outbox data.
2. Pharmacy dispensing: verify prescription and status, allocate suitable unexpired batches, decrement quantities, write transaction rows, update dispensing state, and audit in one transaction.
3. Payment record/provider webhook: verify provider signature/server-side state, enforce idempotency, append payment, and recompute invoice balance transactionally.
4. Admission/transfer/discharge: reserve/release beds and update admission/beds together.
5. Lab result release: persist report status, releaser identity/timestamp, audit, and notification outbox together.

Transactions require MongoDB replica set support. Any fallback must be explicitly designed, tested, and observable; silent partial writes are unacceptable.

## Data lifecycle and privacy

Portfolio seeds must be synthetic and obviously fictional. Production retention, export, correction, deletion, consent, backup, and legal hold rules remain deployment decisions. Encrypt traffic and storage using the hosting platform's controls; application-level encryption for selected fields should be evaluated against search and key-management requirements. Audit reads of sensitive records where feasible. Do not put protected details in logs, notification previews, URLs, socket room names, or analytics labels.

