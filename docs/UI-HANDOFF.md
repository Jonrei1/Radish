# RADISH — UI/UX Handoff (parity with DAMAYAN)

## 1. Purpose & the one rule

RADISH exists to be compared against DAMAYAN as a "simple baseline." For that comparison to say
anything about the *workflow* rather than the *paint job*, RADISH must look like the same
application with fewer features — not a different-looking application.

**The one rule: RADISH may remove screens and components DAMAYAN has. It may never restyle a
screen or component it keeps.** Every token, class string, and layout number below is taken
directly from the live DAMAYAN frontend at `D:\Documents\Coding\Damayan\frontend`. When in doubt,
copy the DAMAYAN source file rather than re-deriving its look from this document.

---

## 2. Design tokens

Source of truth: `frontend/src/app/globals.css`. Tailwind v4, CSS-first — no `tailwind.config.js`.
Port this file's `@theme inline` block and `:root` block **verbatim**.

### Surfaces

| Token | Value |
|---|---|
| `--bg` | `#F0F2F5` |
| `--surface` | `#FFFFFF` |
| `--surface-2` | `#F7F8FA` |
| `--surface-3` | `#EFF1F5` |
| `--skeleton` | `#D2D6E2` |

### Borders

| Token | Value |
|---|---|
| `--border` | `#D1D5E0` |
| `--border-strong` | `#9BA3B5` |

### Text

| Token | Value |
|---|---|
| `--text-primary` | `#0D1117` |
| `--text-secondary` | `#374151` |
| `--text-muted` | `#6B7280` |

### Accent (teal — the brand color)

| Token | Value |
|---|---|
| `--accent` | `#0A6E5F` |
| `--accent-hover` | `#085A4E` |
| `--accent-light` | `#D4EDE9` |
| `--accent-mid` | `#0D9E8C` |

### Semantic triples (`X` text / `X-bg` / `X-border`)

| Semantic | text | bg | border |
|---|---|---|---|
| amber | `#92400E` | `#FEF3C7` | `#F59E0B` |
| red | `#991B1B` | `#FEE2E2` | `#EF4444` |
| blue | `#1E3A8A` | `#DBEAFE` | `#3B82F6` |
| green | `#14532D` | `#DCFCE7` | `#22C55E` |
| purple | `#4C1D95` | `#EDE9FE` | `#8B5CF6` |

### Radii

| Token | Value | Use |
|---|---|---|
| `--radius-card` | `8px` | cards, panels |
| `--radius-btn` | `6px` | buttons, inputs |
| `--radius-pill` | `20px` | pills/chips |
| `--radius-avatar` | `50%` | avatars |
| `--radius-icon` | `6px` | small icon tiles |

### Shadows

```css
--shadow-card:              0 4px 12px rgba(0,0,0,0.05);
--shadow-btn-primary:       0 2px 4px rgba(10,110,95,0.15);
--shadow-btn-primary-hover: 0 4px 8px rgba(10,110,95,0.20);
--shadow-accent-focus:      0 0 0 3px rgba(10,110,95,0.12);
--shadow-modal:              0 20px 60px rgba(0,0,0,0.20);
```

### Heights & widths

| Token | Value |
|---|---|
| `--height-topbar` | `56px` (`--topbar-h`) |
| `--height-snav` | `52px` |
| `--height-tb-btn` | `34px` |
| `--height-sec-btn` | `28px` |
| `--width-sidebar` | `280px` (`--sidebar-w`) |

Responsive steps on `#shell` (a `@container`):

```css
@container (max-width: 1439px) {
  #shell { --sidebar-w: 220px; --topbar-h: 52px; }
}
@container (max-width: 1023px) {
  #shell { --sidebar-w: 260px; /* overlay drawer */ --topbar-h: 48px; }
}
```

(RADISH drops `--width-doc-panel` and `--width-timeline` entirely — there is no documentation
panel or timeline in RADISH.)

### Global base layer (port verbatim)

- `body { @apply font-sans text-[13px] leading-[1.5] bg-bg text-[var(--text-primary)] overflow-hidden; height: 100%; }`
- WCAG 2.2 AA focus ring: `*:focus-visible { @apply outline-2 outline-offset-2 outline-accent; }`
- Global clickable cursor rule: `button, a, [role="button"], select, summary, input[type="radio"], input[type="checkbox"], .sec-btn { cursor: pointer; }`
- Thin custom scrollbars (5px, `--border-strong` thumb, `--text-muted` on hover).
- `.field-input` utility class (white background, `1.5px solid var(--border-strong)`, focuses to
  `--accent` border + `--shadow-accent-focus`).
- `.sec-btn` and its `.primary` / `.destructive` / `.ghost` modifiers (full CSS in globals.css —
  copy as-is).
- `.animate-row-entry` keyframe for newly-inserted table rows (green flash → fade to normal).

---

## 3. Typography

- **IBM Plex Sans** (weights 400/500/600/700) via `next/font/google`, CSS var `--font-sans`.
- **IBM Plex Mono** (weights 400/500) via `next/font/google`, CSS var `--font-mono`. Mono is used
  exclusively for: patient codes (`#PT-0001`), dates, and numeric stat displays — never for
  prose.
- Both wired on `<html className={cn("h-full antialiased", ibmPlexSans.variable, ibmPlexMono.variable)}>`.

Type scale (custom `--font-size-*` tokens):

| Token | Size | Use |
|---|---|---|
| page-title | 20px | `<h1>` on non-tabbed pages |
| section-title | 15px | modal headers, card section titles |
| vital-value | 18px | patient banner name |
| body | 13px | default body text |
| label | 12px | form field values, table cells |
| meta | 11px | secondary/meta text |
| badge | 9px | uppercase badges/pills |

---

## 4. Layout skeleton

```
#shell  (h-full bg-bg font-sans flex flex-col overflow-hidden)
├── Topbar   (h-[var(--topbar-h)] bg-surface border-b sticky top-0 z-[200])
└── #body    (flex flex-1 overflow-hidden)
    ├── Sidebar (w-[var(--sidebar-w)] inline ≥ md, fixed overlay drawer < md)
    └── #middle-column (flex-1 flex flex-col overflow-hidden)
        ├── ScreenNav (h-[52px] bg-surface border-b, sticky-ish tab bar)
        └── scroll area (flex-1 overflow-y-auto px-5 py-4)
            ├── page title block (only on non-dashboard tabs)
            ├── patient banner card
            └── tab content
```

RADISH has **no `DocumentationPanel`** column and **no text-zoom cluster** in the Topbar — those
are the two structural removals from DAMAYAN's shell (see §9). Everything else in this skeleton
is identical, including the responsive `@container` breakpoints on `#shell` described in §2.

Auth-gate pattern to port from `frontend/src/app/dashboard/layout.tsx`: render nothing but a
branded `<AppLoadingScreen />` until `authChecked` is true, then mount the shell. This avoids the
"flash of unauthenticated content" that DAMAYAN's own `admin/layout.tsx` suffers from — RADISH's
admin layout should use the *dashboard* layout's pattern, not the admin layout's.

---

## 5. Component recipes (copy-pasteable class strings)

### Primary button (34px — topbar-height actions)
```
h-[34px] px-3.5 rounded-btn text-[11px] font-semibold bg-accent text-white
border border-accent-hover shadow-btn-primary hover:bg-accent-hover
hover:shadow-btn-primary-hover transition-all duration-150
inline-flex items-center justify-center gap-[5px] whitespace-nowrap cursor-pointer
disabled:opacity-50
```

### Primary button (28px — section-level actions)
```
h-[28px] px-3 rounded-btn text-[11px] font-semibold bg-accent text-white
border border-accent-hover shadow-btn-primary hover:bg-accent-hover
hover:shadow-btn-primary-hover transition-all duration-150
inline-flex items-center justify-center gap-[5px] whitespace-nowrap
min-w-[80px] cursor-pointer
disabled:bg-text-muted disabled:border-border-strong disabled:cursor-not-allowed
```

### Secondary button (`.sec-btn` — use the CSS class, not a Tailwind string)
```html
<button class="sec-btn">Cancel</button>
<button class="sec-btn primary">Save</button>
<button class="sec-btn destructive">Delete</button>
<button class="sec-btn ghost">Icon-only</button>
```

### Text input
```
h-[34px] w-full px-2.5 bg-surface border border-border rounded-btn text-[13px]
text-text-primary outline-none transition-all duration-150
focus:bg-surface focus:border-accent focus:shadow-accent-focus
placeholder:text-text-muted
disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2
```
Error state swaps `border-border focus:border-accent focus:shadow-accent-focus` for
`border-red-border focus:border-red-border focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]`.

### Field label
```
text-[11px] font-semibold text-text-secondary uppercase tracking-[0.5px]
```
Required marker: `<span class="text-red font-bold text-[11px] align-top ml-[2px]">*</span>`.

### Card
```
bg-surface border border-border rounded-card shadow-card overflow-hidden
```
Card header strip (used above tables/lists):
```
flex items-center gap-2.5 px-3.5 py-2.5 bg-surface-2 border-b border-border
```
containing a `w-[26px] h-[26px] rounded-icon bg-surface-3` tile holding a single emoji, then a
label at `text-[10px] font-bold uppercase tracking-[0.6px] text-text-secondary`.

### Table
- `<th>`: `px-2.5 py-2 text-left text-[9px] font-bold uppercase tracking-[0.6px] text-text-secondary border-b border-border`
- `<tr>`: `hover:bg-surface-3 transition-colors border-b border-border last:border-b-0`

### Badges

Role badge:
```
text-[9px] font-bold uppercase tracking-[0.5px] px-1.5 py-[2px] rounded-[4px] border
inline-flex items-center
```
color map — `ADMIN: bg-purple-bg text-purple border-purple-border`,
`DOCTOR: bg-accent-light text-text-primary border-accent` (RADISH only has these two roles, so
unlike DAMAYAN there is no missing-PHARMACIST gap to worry about — every role must have an
entry).

Status badge — active: `bg-green-bg text-green border-green-border`; inactive:
`bg-surface-2 text-text-muted border-border` (same base classes as the role badge).

### Modal
Overlay: `fixed inset-0 bg-black/45 backdrop-blur-[4px] z-[500] flex items-center justify-center animate-in fade-in duration-150`
— close on backdrop `onMouseDown` only when `e.target === e.currentTarget`.
Panel: `bg-surface border border-border rounded-[10px] w-[500px] max-h-[80vh] overflow-y-auto shadow-modal`.
Header: `px-[18px] py-4 border-b border-border` with `<h2 class="text-[15px] font-bold flex-1">`.
Footer: `flex justify-end gap-2 px-[18px] py-3 border-t border-border`.

### Pagination
Page-number buttons: `w-7 h-7 rounded-btn text-[11px] font-semibold`; active =
`bg-accent text-white border-accent-hover shadow-btn-primary`; inactive =
`bg-surface-2 text-text-secondary border border-border hover:bg-surface-3`.

### Skeletons & empty states
Loading rows use the shared `<Skeleton>` primitive (`components/ui/skeleton.tsx`, ported
verbatim) with `bg-skeleton` shimmer. Empty states: centered, `text-[12px] text-text-muted`, with
an optional `text-[11px] text-accent hover:underline` call-to-action link beneath.

### Toasts
`sonner`, mounted once in the root layout: `<Toaster position="bottom-right" />`. The one-time
temp-password toast is a custom fixed element (not sonner) — port `TempPasswordToast` from
`frontend/src/app/admin/accounts/page.tsx` verbatim, including its 60-second auto-dismiss.

---

## 6. Signature patterns (recognizable "DAMAYAN-ness" — keep these exact)

- Patient name is always rendered `Last, First M.` (`lib/patient-utils.ts:displayName`) — never
  `First Last`.
- Patient code renders as `#PT-0001` in `font-mono`, inside a `bg-surface-2 border border-border
  rounded px-1.5 py-[1px]` chip.
- Avatar initials are `firstName[0] + lastName[0]`, uppercased (`lib/patient-utils.ts:initials`).
- Sidebar groups patients under sticky alphabetical letter markers
  (`text-[10px] font-bold uppercase tracking-[0.6px] text-text-muted`), from
  `lib/patient-utils.ts:groupByLetter`.
- Active sidebar patient row: `bg-accent-light border-accent shadow-sm`; inactive:
  `bg-surface border-border hover:bg-surface-2 hover:border-border-strong`.
- Active tab in `ScreenNav`: `bg-accent text-white border-accent shadow-[0_4px_12px_rgba(10,110,95,0.25)]`;
  inactive: `bg-surface-2 text-text-secondary border-border`.
- All dates render via `toLocaleDateString('en-PH', …)` / `toLocaleTimeString('en-PH', …)` — never
  the browser default locale.
- Soft-delete ghost treatment (used for both deleted notes and deleted vitals rows):
  `opacity-55 grayscale blur-[0.5px] select-none hover:opacity-75 hover:blur-none transition-all duration-200`,
  text gets `line-through decoration-text-muted/65 decoration-1`, plus a
  `bg-red-bg text-red border-red-border` "Deleted" badge in the actions column.

---

## 7. Accessibility

- Every icon-only button gets both `aria-label` and `title` with the same text.
- Focus-visible ring is global (`*:focus-visible { outline-2 outline-offset-2 outline-accent }`)
  — never suppress it with `outline-none` without also supplying a visible focus style.
- Destructive actions get a confirmation step — port `DeleteConfirmModal`
  (`components/ui/DeleteConfirmModal.tsx`) rather than reintroducing native `confirm()` (DAMAYAN's
  own `admin/accounts` page still uses `confirm()` in a couple of places — don't copy that; use
  the modal consistently everywhere in RADISH, described also as a divergence in §9).

---

## 8. Port map

| DAMAYAN source | RADISH target | Treatment |
|---|---|---|
| `frontend/src/app/globals.css` | `src/app/globals.css` | **Verbatim** minus doc-panel/timeline width tokens |
| `frontend/src/lib/patient-utils.ts` | `src/lib/patient-utils.ts` | **Verbatim** |
| `frontend/src/lib/utils.ts` (`cn`) | `src/lib/utils.ts` | **Verbatim** |
| `frontend/src/lib/vitals-utils.ts` | `src/lib/vitals-utils.ts` | **Verbatim** |
| `frontend/src/components/ui/{spinner,skeleton,sonner,DeleteConfirmModal}.tsx` | same paths | **Verbatim** |
| `frontend/src/components/layout/SidebarSkeleton.tsx` | same path | **Verbatim** |
| `frontend/src/components/layout/AppLoadingScreen.tsx` | same path | **Verbatim** |
| `frontend/src/components/layout/NarrowScreenNotice.tsx` | same path | **Verbatim** |
| `frontend/src/app/login/page.tsx` | `src/app/login/page.tsx` | **Verbatim** markup; swap Supabase calls for `fetch('/api/auth/login')` |
| `frontend/src/components/vitals/VitalsForm.tsx` | same path | **Verbatim** |
| `frontend/src/components/vitals/VitalsHistoryTable.tsx` | same path | **Adapted** — drop NURSE from permission checks |
| `frontend/src/components/layout/Topbar.tsx` | same path | **Adapted** — remove the text-zoom button cluster and the documentation-panel toggle; keep logo, active-patient chip, user info, sign out |
| `frontend/src/components/layout/Sidebar.tsx` | same path | **Adapted** — remove the `onPublishAndSwitch`/unpublished-note interception (no progress-note drafts exist to protect) |
| `frontend/src/components/layout/ScreenNav.tsx` | same path | **Adapted** — 8 tabs → 2 (`Notes`, `Vital Signs`) |
| `frontend/src/app/dashboard/[patientId]/layout.tsx` | same path | **Adapted** — banner keeps Name/Sex/Age/Birthdate only; drop the address + clinical-profile columns |
| `frontend/src/app/admin/layout.tsx` | `src/app/admin/layout.tsx` | **Adapted** — 3 tabs → 2 (no Analytics); gate rendering on `authChecked` (fixes DAMAYAN's flash-before-redirect bug) |
| `frontend/src/app/admin/accounts/page.tsx` | same path | **Adapted** — DOCTOR/ADMIN roles only; no "Copy Temp PW" (no plaintext storage); use `DeleteConfirmModal` instead of `confirm()` |
| `frontend/src/app/admin/patients/page.tsx` | same path | **Adapted** — same shared `StatusBadge`/`SecBtn`/pagination as accounts page, extracted to one shared module instead of duplicated |
| `frontend/src/app/change-password/page.tsx` | same path | **Rebuilt** on design tokens (DAMAYAN's version uses hardcoded hex — see divergence below) |

---

## 9. Divergences from DAMAYAN, each with a reason

| Divergence | Reason |
|---|---|
| No text-zoom (`A- / 100% / A+`) control in the Topbar | Out of scope — RADISH has no `uiStore.uiScale` concept to control |
| No documentation side panel | Out of scope per the locked project decision |
| `/change-password` rebuilt on design tokens instead of hardcoded hex | DAMAYAN's own `change-password/page.tsx` is the one screen in the app that drifted from the token system (`bg-[#F0F2F5]`, `border-[#D1D5E0]`, etc.) — RADISH shouldn't inherit that inconsistency |
| `StatusBadge` / `SecBtn` / pagination / skeleton extracted into one shared module used by both admin pages | DAMAYAN copy-pastes these between `admin/accounts/page.tsx` and `admin/patients/page.tsx`; RADISH shares them instead, with identical visual output |
| No "Copy Temp PW" button; temp password never persisted in plaintext | DAMAYAN stores `temporaryPassword` in the DB and re-displays it, which is a real exposure; RADISH shows it once and requires Reset Password if lost |
| Admin layout gates rendering on `authChecked` before mounting children | DAMAYAN's `admin/layout.tsx` renders children immediately and redirects after, causing a visible flash of admin UI for non-admins; RADISH copies the *dashboard* layout's safer gating pattern instead |
| One canonical ADMIN landing route, `/admin/accounts`, used everywhere | DAMAYAN is inconsistent across `login/page.tsx`, `admin/page.tsx`, `change-password/page.tsx`, and `dashboard/layout.tsx` about whether ADMIN lands on `/admin/dashboard` or `/admin/accounts` |
| Destructive actions always go through `DeleteConfirmModal` | DAMAYAN's `admin/accounts/page.tsx` still uses native `confirm()` for delete/reset in a few places; RADISH standardizes on the modal it already uses elsewhere |

---

## 10. Do / Don't

**Do**
- Reuse a `--color-*`/`--shadow-*`/`--radius-*` token whenever one already covers the value you
  need.
- Match DAMAYAN's exact class strings for anything listed as "Verbatim" or "Adapted" in §8 —
  copy the source file, then delete/adjust only what the adaptation note specifies.
- Keep `en-PH` date/time formatting and `Last, First M.` name formatting everywhere.

**Don't**
- Introduce a new color outside the token set in §2, even a "close enough" gray or teal.
- Use `rounded-md` / `rounded-lg` / arbitrary radii where `rounded-card` (8px) or `rounded-btn`
  (6px) already exist.
- Use an arbitrary font size (`text-[14px]`, `text-[16.5px]`, …) that isn't one of the eight sizes
  in the type scale (§3).
- Leave a shadcn/ui primitive in its unstyled default state — every primitive in DAMAYAN has been
  re-skinned onto the token system; RADISH's copies must be too.
- Hardcode a hex value anywhere a token already exists for it (this is exactly the mistake
  DAMAYAN's own `change-password` page made — see §9).
