# bill chill — CLAUDE.md

## Project Overview

**bill chill** is a personal bill-tracking app. The core idea: instead of a complex scheduled system, the database is a lean historical ledger and all bill state is derived on the fly from that ledger plus the bill blueprints.

**Stack:** TanStack React Start (SSR), TanStack Router (file-based), TanStack Query, Clerk auth, Drizzle ORM, Cloudflare D1 (SQLite), Cloudflare Workers, Tailwind CSS v4, Biome, TypeScript strict.

---

## Core Paradigm: Just-In-Time (JIT)

The database never stores future or pending bill instances. `bill_instances` is strictly a **historical ledger of payments**. There are no background jobs, cron resets, or pending rows.

When a new calendar month begins the system automatically "resets" — because bill state is derived from whether a payment record exists for the relevant period, not from any stored state flag.

---

## Data Model

Three tables (see `src/db/schema.ts`):

**`pay_schedules`** — A named workflow session. The user pays a group of bills together on a specific day each month.
- `anchorDay`: the day of the month the user sits down to pay this group of bills (not a paycheck date)
- A user may have multiple active schedules (e.g., anchor day 1 and anchor day 15)

**`bills`** — A recurring bill blueprint (the "template").
- `dueDayOfMonth`: the calendar day the bill is actually due to the vendor
- `amountExpected`: expected amount in **cents** (integer)
- `payScheduleId`: optional assignment to a pay schedule (the day the user plans to pay it, independent of due date)
- Bills can be paid well ahead of their `dueDayOfMonth` — assignment to a schedule is a budgeting grouping, not a constraint

**`bill_instances`** — A payment record. Created JIT when the user marks a bill as paid.
- `dueDate`: the **normalized calendar date** for the cycle being paid (e.g., `2026-02-15`), not the date the user clicked "Pay"
- `amountActual`: amount actually paid, in **cents** (integer)
- `paidAt`: timestamp the record was created
- Unique constraint on `(billId, dueDate)` prevents double-recording

**Amounts are always integers in cents.** Divide by 100 for display. Never store floats.

---

## Nearest Unpaid Date Logic

When a user pays a bill, the system determines which cycle to apply the payment to:

1. Find the nearest occurrence of `dueDayOfMonth` (past or future) that has no existing `bill_instance`
2. Apply `Math.min(daysInMonth, dueDayOfMonth)` to handle short months (Feb, 30-day months)
3. The resulting normalized date is stamped as `dueDate` on the new instance

**The look-ahead is unbounded** — if Jan and Feb are already paid and the user pays again on Feb 16, it stamps March's date.

**The UI must always display which date a payment is being applied to** before the user confirms.

---

## Bill State Derivation

The backend serves two lean datasets: active bill blueprints and current-relevant-month instances. The frontend joins them in memory using an O(1) Map keyed on `billId`.

Each bill falls into exactly one of four computed states:

| State | Condition |
|---|---|
| `PAID` | A `bill_instance` exists for the nearest unpaid date (i.e., the bill is current) |
| `OVERDUE` | Unpaid, and `today > Math.min(daysInMonth, dueDayOfMonth)` |
| `MISSED_SCHEDULE` | Unpaid, `today > Math.min(daysInMonth, anchorDay)`, but `today <= Math.min(daysInMonth, dueDayOfMonth)` |
| `UPCOMING` | Unpaid, and neither the anchor day nor the due day has passed yet |

`MISSED_SCHEDULE` signals a budget-discipline issue: the scheduled payment session passed but the bill is not yet technically overdue.

### Date Math Rule

Always use `Math.min(daysInCurrentMonth, targetDay)` when comparing against `anchorDay` or `dueDayOfMonth`. This ensures bills due on the 31st safely evaluate against the 28th in February without special-casing.

---

## Navigation

Three primary pages:
- **Dashboard** (`/dashboard`) — the action-oriented daily view
- **Bills** (`/bills`) — bill management CRUD
- **Schedules** (`/schedules`) — pay schedule management

---

## Dashboard

### Active Pay Schedule (Row 2)

The dashboard always shows the **next upcoming pay schedule** — the active schedule whose `anchorDay` is either today or in the future (whichever comes soonest).

Rationale: users pay bills ahead of time. On the 25th, they're already planning for the 1st. Unpaid bills from a past schedule are already surfaced in Row 1 (critical alerts), so Row 2 stays clean and forward-looking.

### Layout Hierarchy

**Row 1 — Critical Alerts (full width, collapses if empty)**
- Shows only `OVERDUE` bills
- Also surfaces unpaid bills from past schedules that have slipped through

**Row 2 — Active Checklist (2/3 width) + Snapshot Panel (1/3 width)**
- Checklist: flat list of unpaid bills tied to the next upcoming pay schedule — no expandable rows
- Checked bills show a filled checkbox with the row highlighted; unchecked are plain
- `MISSED_SCHEDULE` items highlighted in amber
- Snapshot panel: a small donut/circle chart showing **% of this month's bills paid** — no gamification

**Row 3 — Master Timeline (full width)**
- Table view: Day | Bill | Price | Pay button
- Chronological list of all active upcoming bills (unscheduled or future-scheduled)
- Inline "Pay" buttons

---

## Bills Management Page

A dedicated CRUD page — the source of truth view:
- Full chronological 1–31 view of all active bills, stripped of JIT filters
- Highlights **orphaned bills** (bills assigned to an inactive schedule)
- Interfaces for creating/editing bill blueprints, archiving bills
- Historical trend charts for variable-amount bills (utilities, etc.)

---

## Edge Cases

**Archived schedules:** If a `paySchedule` is deactivated, its bills degrade gracefully — they appear only in the Row 3 timeline as unscheduled bills until reassigned. No data is lost.

**Double-payment prevention:** The `UNIQUE(billId, dueDate)` constraint on `bill_instances` is the last line of defense. The frontend should also disable the "Pay" button optimistically after the first click.

**Multi-device / stale data:** Use SWR (stale-while-revalidate) patterns via TanStack Query. Invalidate relevant queries on any mutation.

---

## Project Conventions

- **Path aliases:** `#/*` and `@/*` both resolve to `src/*`
- **Formatting/linting:** Biome — run `pnpm check` before committing
- **Type checking:** `pnpm typecheck`
- **Auth:** All authenticated routes live under `/_authenticated`. Server functions that touch user data must call `requireAuth()` and use the returned `userId` — never trust client-supplied user IDs
- **DB access:** Use `getDb()` from `src/db/client.ts` inside server functions only
- **Migrations:** After schema changes run `pnpm db:generate`, then `pnpm migrate:local` to apply locally
