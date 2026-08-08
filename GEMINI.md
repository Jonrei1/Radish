# GEMINI.md

This file provides guidance to agentic AI (Gemini, and any other coding agent) working in this
repository. Read it before touching any code.

## What this project is

**RADISH** is a deliberately simple, requirements-driven EMR built to serve as the "current
system" baseline in a comparison against **DAMAYAN**, a much larger problem-oriented EMR that
lives in a separate repo at `D:\Documents\Coding\Damayan`. The comparison only means something if
RADISH *looks* like the same product with fewer features — so this repo's two governing
documents are not optional reading, they are the spec:

- **[`docs/IMPLEMENTATION.md`](docs/IMPLEMENTATION.md)** — what the system does: data model, auth
  design, API surface, page routes, feature specs, build phases, verification checklist. This is
  the authoritative source for behavior. If code and this document disagree, treat it as a bug in
  one of the two and flag it — don't silently pick one.
- **[`docs/UI-HANDOFF.md`](docs/UI-HANDOFF.md)** — exactly how it must look: every design token,
  every component class string, a file-by-file port map from DAMAYAN, and an explicit list of
  intentional divergences with reasons. This is the authoritative source for styling.

**The one rule that governs all UI work: RADISH may remove screens and components DAMAYAN has. It
may never restyle a screen or component it keeps.** When a token, layout number, or class string
in `UI-HANDOFF.md` conflicts with something that "looks reasonable," the document wins.

The requirements themselves come from a business-requirements table (four rows) covering: vital
signs entry (all fields optional), a two-section note (Notes + Orders, no initial/progress
distinction, no tags), viewing all of a patient's notes newest-first, and soft-deleting a note
with a strikethrough that keeps it visible in the series. `docs/IMPLEMENTATION.md` §1 restates
these verbatim and lists everything explicitly out of scope (problem list, medications, document
generation, analytics, note editing, PSGC address lookup, the text-zoom control, the
documentation side panel, NURSE/PHARMACIST roles — only DOCTOR and ADMIN exist here).

## Relationship to the DAMAYAN repo

`D:\Documents\Coding\Damayan` is a **read-only reference** for this project — the source of truth
for what to port and how things currently look. Never edit anything in that repo from a RADISH
task. Never assume RADISH's `.env`, dependencies, or scripts affect it, and vice versa; the two
are fully independent repos, deployments, and databases. When `UI-HANDOFF.md`'s port map says a
DAMAYAN file is "Verbatim," open it in the Damayan repo, copy it, then adapt only what the port
map's "Adapted" note explicitly says to change — don't re-derive the look from memory.

## Current repo state

This repo is scaffolded but the application is **not yet built**. As of now:

- `create-next-app` scaffold is in place (Next.js 16, App Router, `src/` dir, Tailwind v4,
  ESLint), all dependencies from `docs/IMPLEMENTATION.md` §2 are installed (see `package.json`).
- `src/lib/db.ts` — the cached Mongoose connection helper — exists and matches the spec.
- `src/models/{User,Session,Patient,Counter,Note,VitalSign}.ts` + `src/models/index.ts` — Mongoose
  schemas exist. **Verify each against `docs/IMPLEMENTATION.md` §3 before building on top of
  them** — confirm field names, the `authorSnapshot`/`measuredBySnapshot` denormalization, and the
  indexes described there are actually present; the models were scaffolded early and may need
  reconciling with the spec as it's the newer, more detailed document.
- `scripts/seed-admin.ts` exists and roughly matches §4's admin-seeding description (reads
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`, skips if the user exists, hashes with bcrypt cost 12). It sets
  `requiresPasswordChange: false` for the seeded admin, matching the spec's note that a seeded
  credential is treated as a real password, not a temp one.
- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx` are still **stock
  create-next-app boilerplate** (Geist font, default template) — none of the design-token port
  from `UI-HANDOFF.md` §2 has landed yet. This is the first real UI task: port `globals.css`
  verbatim from `frontend/src/app/globals.css` in the Damayan repo, swap Geist for IBM Plex
  Sans/Mono, and replace the boilerplate `page.tsx`.
- No route handlers under `src/app/api/` yet, no `middleware.ts`, no auth helpers
  (`src/lib/auth/session.ts` from §4 doesn't exist yet), no pages beyond the default one, no
  ported layout/sidebar/topbar/tab-nav components.

In short: **data-layer scaffolding exists, everything above it (auth, API, UI) is still to be
built.** Follow the build phases in `docs/IMPLEMENTATION.md` §8 in order — don't jump ahead to
pages before the auth core (`dbConnect` ✅, models ✅, `requireUser`/`requireRole` ❌,
`middleware.ts` ❌) is in place, since every route handler and every page guard depends on it.

## Commands

```bash
npm run dev      # next dev — local dev server
npm run build    # next build
npm run start    # next start — serve the production build
npm run lint     # eslint
```

There is no test runner configured yet. If you add automated tests, wire the script into
`package.json` and document it here.

Seeding the admin account (run once per environment, after `.env` is populated):
```bash
npx tsx scripts/seed-admin.ts
```

## Environment

Copy `.env.example` to `.env` and fill in real values before running anything that touches the
database:

```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/radish
JWT_SECRET=<32+ bytes of random entropy>       # openssl rand -base64 32
SESSION_TTL_HOURS=8
ADMIN_EMAIL=admin@radish.local
ADMIN_PASSWORD=<used once by scripts/seed-admin.ts>
```

`.env` is gitignored — never commit real secrets. `JWT_SECRET` in particular must be strong; it
is the only thing standing between a forged token and full API access once `requireUser` exists.

## Architecture rules to hold in mind while coding

These are the load-bearing decisions from `docs/IMPLEMENTATION.md` — restated here because
getting them wrong quietly breaks the requirement they exist to satisfy.

- **Serverless, not a server.** There is no long-lived Node process. Every route handler must
  `await dbConnect()` itself (never assume a warm connection), and nothing can rely on
  process-lifetime state (in-memory caches, `setInterval`, boot hooks) surviving between
  invocations. This is why admin seeding is a manual script (§4) instead of DAMAYAN's
  `OnModuleInit` hook.
- **Single-active-session JWT binding.** The `sessions` collection has a **unique index on
  `userId`** — there is ever only one live session document per user. Login upserts it with a
  fresh `sid` and signs a JWT containing that `sid`. `requireUser()` must reject any request where
  `session.sid !== payload.sid`, not just check that the JWT verifies. This is the entire
  mechanism behind "the link can't be copied from browser to browser" — get the equality check
  wrong (e.g. skip it, or only check on login) and that requirement silently stops being true.
  Don't try to strengthen it further with IP/UA fingerprinting — that trade-off was already
  considered and rejected (§4) because it produces false-positive logouts.
- **Two-layer auth verification, and don't confuse the layers.** `middleware.ts` (Edge runtime,
  `jose`, signature+expiry only — no Mongoose, Edge can't run it) is a **UX fast-path**, not the
  security boundary. `requireUser()` in a route handler (Node runtime, full `sessions` +
  `users` lookup) is the **authoritative** check and must run at the top of every API route
  regardless of what middleware already did.
- **Notes are immutable.** There is no edit endpoint and none should be added — only
  `POST` (create) and `DELETE` (soft-delete: sets `isDeleted`/`deletedBy`/`deletedAt`, never
  removes the document). A soft-deleted note stays in the newest-first list its patient's `notes`
  endpoint returns; it must not be filtered out server-side, only styled as a ghost client-side.
  Same soft-delete-only rule applies to vitals, except vitals *can* be edited (`PATCH`) per
  requirement row 1 — don't conflate the two collections' mutability rules.
- **All vitals fields are optional, including the datetime.** Zod schemas must accept an empty or
  partial body; `measuredAt` defaults server-side to "now" rather than being required. Range
  validation (§3's table) applies only to fields that are actually present in the request.
- **Patient codes must be generated atomically.** Use the `counters` collection with
  `findOneAndUpdate({ $inc: { seq: 1 } }, { upsert: true, new: true })` — never DAMAYAN's
  read-max-then-increment approach, which the spec explicitly calls out as unsafe under
  concurrent writes.
- **No plaintext temp-password storage.** Unlike DAMAYAN, the generated temporary password is
  never written to the `users` document — it's returned once in the creation/reset response and
  the UI must not offer any way to re-display it later (no "Copy Temp PW" button). Losing it means
  using Reset Password, which is the intended failure mode.
- **Two roles only.** `role` is `'DOCTOR' | 'ADMIN'` everywhere — schemas, zod enums, permission
  checks, UI role badges. Don't leave a NURSE/PHARMACIST branch lying around from a copy-pasted
  DAMAYAN permission check; the port map (`UI-HANDOFF.md` §8) calls out every component where that
  branch needs to be stripped (e.g. `VitalsHistoryTable`'s `canEdit`/`canDelete`).
- **One canonical ADMIN landing route:** `/admin/accounts`, used consistently in the root
  redirect, the login redirect, the `/admin` index redirect, and the dashboard-layout guard.
  DAMAYAN is inconsistent about this across four files — don't reproduce that inconsistency here.
- **Response envelope contract.** List endpoints return
  `{ data: T[], meta: { total, page, limit, totalPages } }` and error responses return
  `{ message: string }` with the appropriate status — ported list/pagination components and the
  `apiRequest`-style fetch wrapper are written against this shape; deviating breaks them silently
  rather than loudly.

## Working conventions

- Match the surrounding code's idiom, naming, and comment density — don't introduce a different
  style in a file you're extending.
- When porting a component from DAMAYAN, copy the source file first, then apply only the specific
  adaptation the port map describes. Don't rewrite it "cleaner" in the process — that's exactly
  the kind of drift the one rule in `UI-HANDOFF.md` §1 exists to prevent.
- Before adding a new color, radius, shadow, or font size, check `UI-HANDOFF.md` §2–3 for an
  existing token first. A hardcoded hex where a token already exists is treated as a bug (see
  §9's note on DAMAYAN's own `change-password` page, which drifted this way and is explicitly
  called out as a mistake not to repeat).
- Follow the build-phase order in `docs/IMPLEMENTATION.md` §8; each phase's verification should
  pass before starting the next.
- Before marking any auth or session-binding work done, walk the session-binding check in
  `docs/IMPLEMENTATION.md` §9 step 8 by hand (copy the cookie to a second browser, log in again in
  the first, confirm the second is rejected) — this is the one behavior that's easy to get
  "looks right" without actually being right.
