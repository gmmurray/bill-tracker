# bill chill — CLAUDE.md

## Project Overview

**bill chill** is a personal bill-tracking app. The database is a lean historical ledger of payments — all bill state is derived on the fly from that ledger plus the bill blueprints. Detailed domain rules live in [docs/business-logic.md](docs/business-logic.md); consult it for state derivation, payment cycle logic, or schedule selection.

**Stack:** TanStack React Start (SSR), TanStack Router (file-based), TanStack Query, Clerk auth, Drizzle ORM, Cloudflare D1 (SQLite), Cloudflare Workers, Tailwind CSS v4, Radix UI, Biome, TypeScript strict.

---

## Core Paradigm: Just-In-Time (JIT)

`bill_instances` is **a historical ledger of payments only**. No future or pending rows. No background jobs, no nightly resets. Bill state is computed in memory from the ledger + blueprints + `today`.

When a new month begins the "reset" is implicit — there's no instance for the new cycle yet, so the bill derives to `UPCOMING`. Never add stored state flags for cycles, pending payments, or "current period."

Details and algorithms: [docs/business-logic.md](docs/business-logic.md).

---

## Data Model

Three tables (see `src/db/schema.ts`):

**`pay_schedules`** — A named workflow session.
- `anchorDay`: day of the month the user sits down to pay this group of bills (not a paycheck date)
- Users may have multiple active schedules
- `isActive`: soft-delete flag for archiving

**`bills`** — A recurring bill blueprint.
- `dueDayOfMonth`: actual vendor deadline
- `amountExpected`: expected amount in **cents** (integer)
- `payScheduleId`: optional schedule assignment — a budgeting grouping, not a constraint. Bills can be paid ahead of `dueDayOfMonth`.
- `isAutoPay`: informational only; auto-pay bills still need an instance recorded to count as paid

**`bill_instances`** — A payment record. Created when the user marks a bill paid.
- `dueDate`: the **normalized calendar date** for the cycle being paid (e.g. `2026-02-15`), not when the user clicked Pay
- `amountActual`: amount actually paid, in **cents**
- `paidAt`: timestamp of the record
- `UNIQUE(billId, dueDate)` prevents double-recording — server functions catch this and throw `ConflictError`

**Amounts are always integers in cents.** Divide by 100 for display. Never store floats.

### Date Math Rule

Always compare `today.getDate()` against `Math.min(daysInCurrentMonth, targetDay)` — never against raw `dueDayOfMonth` / `anchorDay`. Use `clampDayToMonth(day, year, month)` from `bills-helpers.ts`. This makes "due on the 31st" safely evaluate in February without special-casing.

---

## Navigation

Four primary surfaces:

- **Dashboard** (`/dashboard`) — daily action view ([docs/pages/dashboard.md](docs/pages/dashboard.md))
- **Bills** (`/bills`) — bill management CRUD
- **Schedules** (`/schedules`) — pay schedule management ([docs/pages/schedules.md](docs/pages/schedules.md))
- **Bill Actions drawer** — global, app-wide ([docs/pages/actions.md](docs/pages/actions.md))

---

## Project Conventions

- **Path aliases:** `#/*` and `@/*` both resolve to `src/*`
- **Formatting/linting:** Biome — run `pnpm check` before committing
- **Type checking:** `pnpm typecheck`
- **Auth:** All authenticated routes live under `/_authenticated`. Server functions touching user data must call `requireAuth()` / `getAuthUserId()` and use the returned `userId` — never trust client-supplied user IDs
- **DB access:** Use `getDb()` from `src/db/client.ts` inside server functions only
- **Migrations:** After schema changes run `pnpm db:generate`, then `pnpm migrate:local` to apply locally
- **Queries pre-warmed by router loaders.** Read queries on data-driven routes are pre-warmed via `queryClient.ensureQueryData` in the route loader, using `*QueryOptions(...)` factories from the feature's `*-queries.ts`. Components keep their `useQuery` calls; loader-backed routes don't render `isLoading` branches because the data is already in cache on first render.

### Component Structure

- **`src/components/ui/`** — Radix UI primitives wrapped and styled with Tailwind. Reusable base components only (Button, Dialog, Checkbox, etc.)
- **`src/components/`** — App-level shared components (layouts, nav, global drawers)
- **`src/features/`** — Feature modules. Pattern per feature:
  - `[feature]-service.ts` — server functions
  - `[feature]-queries.ts` — TanStack Query hooks + `*QueryOptions` factories
  - `[feature]-model.ts` — types + Zod schemas
  - `[feature]-helpers.ts` — pure utility functions (state derivation, date math, etc.)
  - `[feature]-constants.ts` — constants (only when needed)

Feature modules: `auth/`, `bills/`, `pay-schedules/`. Bill instance mutations (`recordBillPayment`, `logHistoricalPayment`, etc.) live under `bills/` — bill instances are not a standalone feature.

---

## Reference Docs

- **[docs/business-logic.md](docs/business-logic.md)** — domain rules (JIT, state derivation, nearest-unpaid, active schedule selection, auto-pay, orphans, double-payment, multi-device)
- **[docs/pages/dashboard.md](docs/pages/dashboard.md)** — dashboard spec
- **[docs/pages/actions.md](docs/pages/actions.md)** — global Bill Actions drawer spec
- **[docs/pages/schedules.md](docs/pages/schedules.md)** — schedules pages spec
- **[docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md)** — color palette, component patterns, Tailwind conventions
- **[docs/TODO.md](docs/TODO.md)** — outstanding tasks
- **[docs/future.md](docs/future.md)** — deferred ideas, not committed work
