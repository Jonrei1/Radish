# RADISH — Implementation Spec

RADISH is a deliberately simple EMR built to satisfy the RADISH business requirements
(`Compiled Requirements v04_with allied.md`) and to serve as the "current system" baseline
compared against DAMAYAN. Stack: **serverless Next.js (App Router route handlers as the API)
+ MongoDB/Mongoose**, no separate backend process.

Visual parity with DAMAYAN is a hard requirement of this project but is specified separately in
[`UI-HANDOFF.md`](./UI-HANDOFF.md). This document specifies what the system *does*.

---

## 1. Scope & non-goals

### In scope — the four requirement rows, verbatim intent

1. **Vital signs entry.** Admin or Author/Doctor inputs or edits vital signs. The entry module
   displays patient identifiers (Last, First, Middle, Ext; date of birth; age). Data: systolic BP,
   diastolic BP, heart rate, respiratory rate, temperature, oxygen saturation, date and time.
   **All fields are optional.** Author and datetime of the entry are always captured.
2. **Note input.** Author/Doctor inputs a note consisting of exactly two content sections —
   **Notes** and **Orders** — plus author name and date/time. There is **no distinction** between
   an initial and a progress note, and **no tags**.
3. **Note viewing.** Any doctor can view notes. The module displays patient identifiers (as above).
   Selecting a patient shows all of that patient's notes, arranged newest → oldest.
4. **Note deletion.** Author/Doctor deletes a note. The deleted note is **struck through in its
   entirety** but **remains visible** in the series of notes (soft delete, not removal).

### Explicitly not in RADISH

Problem list, medication list, document generation (certificates/prescriptions/referrals),
attachments, audit-log viewer, analytics dashboard, initial-vs-progress note distinction, note
tags, note editing (notes are immutable once saved — only soft-delete exists), PSGC address
lookup / structured address, the text-zoom control, the documentation side panel.

Two roles only: **DOCTOR** and **ADMIN**. (DAMAYAN's NURSE and PHARMACIST roles do not exist
here — the requirements never mention them.)

---

## 2. Stack & dependencies

- **Next.js** (App Router). Route handlers under `src/app/api/**/route.ts` are the entire backend
  — no NestJS, no standalone server.
- **React 19**, **Tailwind CSS v4** (CSS-first — no `tailwind.config.js`, tokens live in
  `globals.css`, see UI-HANDOFF).
- **MongoDB** via **Mongoose** — schemas + validation colocated, familiar model API.
- **TanStack Query** for server state, **Zustand** for client state (auth store, active-patient
  store) — same libraries DAMAYAN already uses, so ported hooks need minimal rework.
- **`jose`** for JWT sign/verify (Edge-compatible — required because `middleware.ts` runs on the
  Edge runtime, where Node crypto and Mongoose are unavailable).
- **`bcryptjs`** for password hashing.
- **`zod`** for request validation (mirrors DAMAYAN's `class-validator` DTOs, one zod schema per
  endpoint).
- **`react-hook-form`** + **`@hookform/resolvers`** for forms.
- **`lucide-react`**, **`sonner`**, **`clsx`**, **`tailwind-merge`**, **`tw-animate-css`** — same
  as DAMAYAN, needed to port components byte-for-byte.

### Scaffold

```bash
npx create-next-app@latest radish --typescript --tailwind --app --src-dir --import-alias "@/*"
cd radish
npm install mongoose jose bcryptjs zod react-hook-form @hookform/resolvers zustand @tanstack/react-query lucide-react sonner clsx tailwind-merge tw-animate-css
```

### Environment contract — `.env.local`

```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/radish
JWT_SECRET=<32+ byte random string>
SESSION_TTL_HOURS=8
ADMIN_EMAIL=admin@radish.local
ADMIN_PASSWORD=<used once by scripts/seed-admin.ts>
```

`JWT_SECRET` must be at least 32 bytes of entropy (`openssl rand -base64 32`). Never commit
`.env.local`; provide `.env.example` with placeholder values.

### Serverless DB connection — `src/lib/db.ts`

Mongoose connections must be cached across hot serverless invocations (a fresh `mongoose.connect`
per request exhausts the connection pool under load). Cache the connection promise on
`globalThis`, following the standard Next.js + Mongoose serverless pattern:

```ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error('MONGODB_URI is not set');

let cached = (global as any)._mongoose;
if (!cached) cached = (global as any)._mongoose = { conn: null, promise: null };

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

Every route handler calls `await dbConnect()` before touching a model.

---

## 3. Data model — 5 collections

MongoDB has no foreign-key enforcement and no cross-collection transactions without a replica
set, so referenced fields are **denormalized with a snapshot** wherever a historical record must
survive the referenced document being edited or deleted (DAMAYAN gets this for free from
Postgres FKs; RADISH does not).

### `users`

```ts
{
  email: string;              // unique, lowercased, trimmed
  passwordHash: string;       // bcrypt, cost 12
  firstName: string;
  lastName: string;
  middleName?: string;
  extension?: string;         // "Jr.", "III"
  role: 'DOCTOR' | 'ADMIN';
  licenseNumber?: string;     // required when role === 'DOCTOR'
  isActive: boolean;          // default true
  requiresPasswordChange: boolean; // default true on creation
  createdAt: Date;
  updatedAt: Date;
}
```
Index: `{ role: 1, isActive: 1 }`.

No plaintext temp-password field (see §4, "Flagged decision").

### `sessions` — the single-active-session mechanism

```ts
{
  userId: ObjectId;   // unique — one session doc per user, ever
  sid: string;        // crypto.randomUUID(), rotated on every login
  expiresAt: Date;    // TTL index, expireAfterSeconds: 0
  createdAt: Date;
}
```
`userId` **unique** index — a login always upserts this single doc, so issuing a new `sid`
implicitly invalidates whatever `sid` an older browser's cookie is carrying. `expiresAt` carries
a MongoDB TTL index so expired sessions are reaped automatically without a cron job.

### `patients`

```ts
{
  patientCode: string;   // unique, "PT-0001"
  lastName: string;
  firstName: string;
  middleName?: string;
  extension?: string;
  dateOfBirth: Date;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  isActive: boolean;     // default true
  createdBy: ObjectId;   // ref users
  createdAt: Date;
  updatedAt: Date;
}
```
Indexes: `{ lastName: 1, firstName: 1 }`, `{ isActive: 1, lastName: 1, firstName: 1 }`.

No address fields, no allergies — out of scope per the requirements and the locked decision to
keep the patient record minimal.

**`patientCode` generation** must be concurrency-safe. DAMAYAN's approach (read the max existing
code, `parseInt` + 1, retry on collision — `backend/src/patients/patients.service.ts:13`) is
**not** safe under concurrent writes. RADISH uses an atomic counter document instead:

```ts
// counters: { _id: 'patientCode', seq: number }
const counter = await Counter.findOneAndUpdate(
  { _id: 'patientCode' },
  { $inc: { seq: 1 } },
  { upsert: true, new: true },
);
const patientCode = `PT-${String(counter.seq).padStart(4, '0')}`;
```

### `notes` — requirement rows 2–4

```ts
{
  patientId: ObjectId;
  authorId: ObjectId;
  authorSnapshot: {              // denormalized — survives account changes/deletion
    firstName: string;
    lastName: string;
    role: 'DOCTOR' | 'ADMIN';
    licenseNumber?: string;
  };
  noteDatetime: Date;    // default now; user-editable at creation
  notes: string;         // required — the "Notes" section
  orders?: string;       // optional — the "Orders" section
  isDeleted: boolean;    // default false — soft delete only, never hard-deleted
  deletedBy?: ObjectId;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```
Index: `{ patientId: 1, noteDatetime: -1 }` — the exact access pattern of requirement row 3
("all notes displayed and arranged recent to oldest").

Notes are **immutable** after creation except for the soft-delete flag — there is no edit
endpoint, matching the locked decision and the requirement's silence on editing.

### `vitalsigns` — requirement row 1

```ts
{
  patientId: ObjectId;
  sbp?: number;                 // 50–300
  dbp?: number;                 // 20–200
  heartRate?: number;           // 20–300
  respiratoryRate?: number;     // 5–60
  temperature?: number;         // 30.0–45.0, one decimal
  oxygenSaturation?: number;    // 50–100
  measuredAt: Date;             // defaults to now — see note below
  measuredBy: ObjectId;
  measuredBySnapshot: { firstName: string; lastName: string; role: 'DOCTOR' | 'ADMIN' };
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
Index: `{ patientId: 1, measuredAt: -1 }`.

**Every vitals field is optional per the requirement**, including implicitly the datetime — the
requirement lists "date and time" alongside the vitals as one of the optional data points. The
API must not reject a request with zero fields set; `measuredAt` defaults server-side to
`new Date()` so a bare "vitals taken but nothing recorded yet" entry is still valid. Range
validation (see below) is applied only to fields that are present.

Range validation (zod, ported from DAMAYAN's `CreateVitalsDto`):

| Field | Range |
|---|---|
| `sbp` | 50–300 |
| `dbp` | 20–200 |
| `heartRate` | 20–300 |
| `respiratoryRate` | 5–60 |
| `temperature` | 30.0–45.0 |
| `oxygenSaturation` | 50–100 |

---

## 4. Auth design — JWT + session-id binding

The requirement is explicit: the auth token must be a simple env-configured JWT, but it must
**include a session id so a copied link/cookie can't be reused across browsers.**

### Signing & transport

- `jose`, algorithm `HS256`, secret = `JWT_SECRET`.
- Payload: `{ sub: userId, role, sid, iat, exp }`. TTL 8 hours (`SESSION_TTL_HOURS`).
- Cookie name `radish_session`: `httpOnly`, `sameSite: 'lax'`, `secure` in production, `path: '/'`.
  Never placed in a URL, query string, or `localStorage`.

### Session-id binding (the anti-copy-paste mechanism)

1. On successful login, generate `sid = crypto.randomUUID()`.
2. **Upsert** the single `sessions` document for that `userId` (unique index on `userId` — see
   §3) with the new `sid` and a fresh `expiresAt`.
3. Sign the JWT with that `sid` and set the cookie.
4. On every authenticated request, `requireUser()` (below) loads the `sessions` doc for
   `payload.sub` and rejects the request unless `session.sid === payload.sid`.

Effect: because there is exactly one session document per user, a second login **overwrites**
the first browser's `sid`. The first browser's cookie still verifies (signature and expiry are
fine) but fails the `sid` equality check on its very next request — it is rejected immediately,
without waiting for the JWT to expire. Logging out deletes the session doc outright, killing any
copy instantly.

**Honest limitation, stated plainly:** this stops a copied cookie from *outliving* the session
that issued it — it does not stop someone from using a copied cookie concurrently *before* the
next login happens. A user-agent/IP fingerprint check was considered and rejected: it produces
false positives (network changes, browser updates) that would log out legitimate users, which is
worse for a clinical tool than the narrow scenario it would additionally catch. Single-session
binding is the right trade-off here.

### Two-layer verification

- **`middleware.ts`** (Edge runtime) — signature + expiry check only, via `jose` (Mongoose cannot
  run on Edge). Unauthenticated requests to any route other than `/login` are redirected there.
  Requests to `/admin/*` additionally require `payload.role === 'ADMIN'` client-side-fast-path;
  this is a UX shortcut only, **not** the security boundary.
- **`src/lib/auth/session.ts` → `requireUser(req)`** — the authoritative check, called at the top
  of every API route handler:
  1. Verify JWT signature + expiry.
  2. Load the `sessions` doc for `payload.sub`; reject (`401`) unless it exists and
     `session.sid === payload.sid`.
  3. Load the `users` doc; reject (`401`) if `!isActive`.
  4. Password-change interlock (ported from DAMAYAN's `JwtAuthGuard`): if
     `user.requiresPasswordChange` is true, only `POST /api/auth/change-password` and
     `GET /api/auth/me` may proceed — every other route throws `403`.
  5. Role check via a thin `requireRole(user, ['ADMIN'])` helper used by admin-only routes.

### Passwords

- `bcryptjs`, cost factor 12.
- Complexity rule (ported from DAMAYAN's `ChangePasswordDto`): minimum 12 characters, at least
  one uppercase, one lowercase, one digit, one special character
  (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/`).
- Temp-password generator ported from `backend/src/accounts/accounts.service.ts` but corrected:
  DAMAYAN's version maps `randomBytes` bytes into an excluded-ambiguous-character alphabet via
  modulo, which is both slightly biased and not guaranteed to satisfy the complexity rule above.
  RADISH's generator explicitly composes one character from each required class first, then fills
  the remaining length from the full alphabet via rejection sampling (reroll any byte that would
  overflow the alphabet length instead of using modulo), then shuffles — guaranteeing the result
  always passes its own complexity rule.

**Flagged decision:** RADISH does **not** persist the generated temporary password in plaintext
anywhere (DAMAYAN stores it in `users.temporary_password` and reads it back for a "Copy Temp PW"
button on the accounts table). In RADISH the password is shown exactly once, in the 60-second
`TempPasswordToast` at creation/reset time, and then discarded — never stored, never re-displayed.
If an admin misses it, the fix is **Reset Password**, which issues and displays a new one. This is
a stricter, more defensible posture for a system whose whole pitch is being the simple baseline.

### Admin seeding

No long-lived process exists in a serverless deployment to hang a `OnModuleInit` boot hook on
(DAMAYAN's `accounts.service.ts` seeds admins this way). Instead: `scripts/seed-admin.ts`, run
manually once per environment —

```bash
npx tsx scripts/seed-admin.ts
```

Reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment, skips if a user with that email
already exists, otherwise creates an ADMIN with `requiresPasswordChange: false` (the seeded
credential is assumed to already be a real password the operator chose, not a temp one).

---

## 5. API surface — route handlers under `src/app/api/`

Every handler: `await dbConnect()` → `requireUser(req)` (or `requireRole`) → `zod` parse of body/
query → Mongoose op → JSON response. Errors return `{ message: string }` with the appropriate
status code — the same shape DAMAYAN's `apiRequest()` already expects, so the ported fetch
wrapper needs no changes.

List endpoints return DAMAYAN's pagination envelope so ported table/pagination components work
unmodified:
```ts
{ data: T[], meta: { total: number; page: number; limit: number; totalPages: number } }
```

| Method | Path | Access | Notes |
|---|---|---|---|
| `POST` | `/api/auth/login` | public | body `{ email, password }`; bcrypt compare; rotates `sid`; sets cookie |
| `POST` | `/api/auth/logout` | any | deletes the session doc; clears cookie |
| `GET` | `/api/auth/me` | any | current profile, for the auth store |
| `POST` | `/api/auth/change-password` | any | body `{ newPassword }`; clears `requiresPasswordChange` |
| `GET` | `/api/accounts` | ADMIN | `?role=&isActive=&page=&limit=` |
| `POST` | `/api/accounts` | ADMIN | create DOCTOR/ADMIN, returns `{ user, tempPassword }` once |
| `GET` | `/api/accounts/[id]` | ADMIN | |
| `PATCH` | `/api/accounts/[id]` | ADMIN | |
| `DELETE` | `/api/accounts/[id]` | ADMIN | refuses if it's the last ADMIN |
| `POST` | `/api/accounts/[id]/reset-password` | ADMIN | new temp password, `requiresPasswordChange: true` |
| `GET` | `/api/patients` | any | `?search=&page=&limit=&includeInactive=` |
| `POST` | `/api/patients` | DOCTOR, ADMIN | creates + assigns `patientCode` |
| `GET` | `/api/patients/[id]` | any | |
| `PATCH` | `/api/patients/[id]` | DOCTOR, ADMIN | demographic edits |
| `PATCH` | `/api/patients/[id]/deactivate` | ADMIN | |
| `PATCH` | `/api/patients/[id]/reactivate` | ADMIN | |
| `GET` | `/api/patients/[id]/notes` | any | newest → oldest, **includes soft-deleted** (ghost rows) |
| `POST` | `/api/patients/[id]/notes` | DOCTOR | body `{ notes, orders?, noteDatetime? }` |
| `DELETE` | `/api/notes/[id]` | author or ADMIN | soft delete only — sets `isDeleted`, `deletedBy`, `deletedAt` |
| `GET` | `/api/patients/[id]/vitals` | any | paginated, newest → oldest |
| `POST` | `/api/patients/[id]/vitals` | DOCTOR, ADMIN | all fields optional |
| `PATCH` | `/api/vitals/[id]` | DOCTOR, ADMIN | edit (requirement row 1 allows edits) |
| `DELETE` | `/api/vitals/[id]` | DOCTOR, ADMIN | soft delete |

`forbidNonWhitelisted`-equivalent behavior: zod schemas use `.strict()` so an unexpected body key
400s, matching DAMAYAN's global `ValidationPipe` behavior that the ported forms are already
written against.

---

## 6. Page routes

```
/                              → redirect: ADMIN → /admin/accounts, DOCTOR → /dashboard, else /login
/login
/change-password
/dashboard                     → empty state, "Select a patient from the sidebar"
/dashboard/[patientId]         → redirect to /dashboard/[patientId]/notes
/dashboard/[patientId]/notes   → Notes tab (default tab)
/dashboard/[patientId]/vitals  → Vital Signs tab
/admin                         → redirect to /admin/accounts
/admin/accounts                → Staff Accounts (DOCTOR + ADMIN accounts)
/admin/patients                → Patient Accounts (list, deactivate/reactivate)
```

`ScreenNav` (ported from `frontend/src/components/layout/ScreenNav.tsx`) drops from DAMAYAN's
eight tabs to exactly two:

| id | label | icon | path |
|---|---|---|---|
| `notes` | Notes | `FileText` | `/notes` |
| `vitals` | Vital Signs | `Activity` | `/vitals` |

`AdminTabsNav` (ported from `frontend/src/app/admin/layout.tsx`) drops from three tabs to two
(**Staff Accounts**, **Patient Accounts** — no Analytics Dashboard tab). One canonical ADMIN
landing route, `/admin/accounts`, everywhere — DAMAYAN is inconsistent across four different
files about whether ADMIN lands on `/admin/dashboard` or `/admin/accounts`; RADISH picks one and
uses it uniformly in the login redirect, the root redirect, the admin index redirect, and the
dashboard-layout guard.

---

## 7. Feature specs

### Notes tab (`/dashboard/[patientId]/notes`)

- A composer card pinned at the top of the tab, visible to DOCTOR only: a **Notes** textarea
  (required), an **Orders** textarea (optional), and a datetime input defaulting to "now" —
  `POST /api/patients/[id]/notes`.
- Below it, the full series, **newest → oldest**, satisfying requirement row 3. Each entry renders
  as a card: author name + role badge (ported styling from DAMAYAN's `NoteCard.tsx` /
  `NoteStatusBadge.tsx`), the `en-PH`-formatted date/time in mono, the Notes body, and the Orders
  body (omitted if empty).
- **Delete** (author or ADMIN only) calls `DELETE /api/notes/[id]`. The deleted card is not
  removed from the series — it re-renders with the exact ghost treatment DAMAYAN already applies
  to soft-deleted vitals rows (`opacity-55 grayscale blur-[0.5px] line-through decoration-text-muted/65`,
  plus a red **Deleted** badge) — this is requirement row 4's "strikethrough on all text of
  deleted note; still visible on the series of notes," reusing an existing, already-verified
  visual pattern instead of inventing a new one.
- No edit action anywhere in the UI — notes are write-once, soft-delete-only.

### Vital Signs tab (`/dashboard/[patientId]/vitals`)

Ported near-verbatim from `VitalsScreen.tsx` / `VitalsForm.tsx` / `VitalsHistoryTable.tsx`, with
the NURSE branch removed from every permission check (`canEdit`/`canDelete` now check
`DOCTOR || ADMIN` only). Severity coloring (`classifyBloodPressure`, `classifyHeartRate`, etc.
from `lib/vitals-utils.ts`) ports unchanged. Soft-deleted rows use the same ghost/strikethrough
treatment already described above.

### Patient identifiers (both vitals and notes)

Both requirement rows demand patient identifiers on screen. The patient banner block ported from
`dashboard/[patientId]/layout.tsx` supplies **Name (Last, First Middle Ext.) / Sex / Age /
Birthdate** — the address and clinical-profile (allergies/problem-count) columns are removed
since those fields don't exist on the minimal patient record.

---

## 8. Build phases

1. **Scaffold + tokens** — `create-next-app`, port `globals.css` verbatim, wire IBM Plex Sans/Mono
   fonts, root layout with `QueryProvider` + `Toaster`.
2. **DB/auth core** — Mongoose models, `dbConnect`, `requireUser`/`requireRole`, JWT sign/verify
   helpers, `middleware.ts`, `scripts/seed-admin.ts`.
3. **Auth pages** — `/login`, `/change-password` (rebuilt on tokens — see UI-HANDOFF divergence
   note), auth store (Zustand), `apiRequest` wrapper.
4. **App shell** — `Topbar` (adapted), `Sidebar` (adapted, patient search + New Patient), tab
   `ScreenNav` (2 tabs), patient banner, dashboard layout guard.
5. **Notes tab** — composer, series, soft-delete + ghost styling.
6. **Vitals tab** — form modal, history table, severity coloring.
7. **Admin pages** — `/admin/accounts` (create/edit/reset-password/delete staff), `/admin/patients`
   (list + deactivate/reactivate), shared `StatusBadge`/`SecBtn`/pagination/skeleton components
   (deduplicated — see UI-HANDOFF divergence note).
8. **Seed + verification** — run `seed-admin`, walk the verification checklist below.

---

## 9. Verification

- `npm run build` completes with no type or lint errors.
- `npx tsx scripts/seed-admin.ts` creates the ADMIN account.
- Manual walkthrough:
  1. Log in as the seeded admin.
  2. Create a DOCTOR account → confirm the temp-password toast appears once and is not
     retrievable afterward.
  3. Log out; log in as that doctor; confirm forced redirect to `/change-password`; set a new
     password meeting the complexity rule; confirm redirect into `/dashboard`.
  4. Register a new patient from the sidebar `+ New Patient` button.
  5. Open the patient, write a note (Notes + Orders), confirm it appears newest-first.
  6. Delete the note; confirm it remains visible with strikethrough/ghost styling in the same
     series, not removed.
  7. Record vitals leaving several fields blank; confirm no validation error; edit the entry;
     delete it; confirm ghost styling.
  8. **Session-binding check**: copy the `radish_session` cookie value into a second browser
     (or a private window) while still signed in in the first. Confirm it works there too. Then
     log in again as the same user in the *first* browser. Confirm the *second* browser's next
     request is rejected (401) — the copied session has been invalidated by the new login.
  9. In `/admin/patients`, deactivate then reactivate the patient created above.
  10. Confirm a DOCTOR account is redirected away from `/admin/*`.
