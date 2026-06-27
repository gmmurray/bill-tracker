# bill chill — Business Logic

The domain rules that govern how bill state is computed, when payments apply to which cycles, and how the app decides what to surface as actionable. Code that touches the bill domain (state derivation, payment recording, dashboard/action-panel views) should reason from these rules.

Page-level UX specs live alongside this in `docs/pages/`. They reference these rules but don't redefine them.

---

## JIT in detail

`bill_instances` is a **historical ledger of payments only**. It never contains future or pending rows. No background jobs, no nightly reset, no "current cycle" flag.

A bill's current state is *always* derived in memory from:

1. The bill blueprint (`dueDayOfMonth`, optional `payScheduleId`)
2. The schedule it's assigned to, if any (`payDate`, `isActive`)
3. The historical payment ledger for this bill
4. `today`

When a new calendar month begins, the "reset" happens implicitly: there's no instance for the new month's cycle yet, so the bill derives to `UPCOMING` (or `OVERDUE` / `MISSED_SCHEDULE` once the relevant date passes).

This is the central thesis of the app. Don't add stored state flags for cycles, pending payments, or "current period" — the ledger is the source of truth.

---

## Nearest Unpaid Date Logic

When the user marks a bill as paid, the system computes which cycle the payment applies to:

1. Starting from the current month, walk forward month-by-month looking for an occurrence of `dueDayOfMonth` (clamped via the date-math rule below) that has no existing `bill_instance`
2. The first match is the `dueDate` stamped on the new instance

**The look-ahead is unbounded.** If Jan, Feb, and March are already paid and the user pays again, the system stamps April. This is what enables the pay-ahead workflow.

**The walk does not look backward.** If the user adds a bill mid-month and skips paying it for the past two months, those past cycles are never "rediscovered" by the nearest-unpaid logic. Recording payments for past cycles is done explicitly via the **Log Historical Payment** flow on the bill detail page, which sets `dueDate` directly without invoking nearest-unpaid. See [Historical Payment Cycle Selection](#historical-payment-cycle-selection) for how that flow constrains `dueDate`.

**The walk also skips cycles that predate `bill.createdAt`.** A bill added on June 25 with `dueDayOfMonth = 11` won't surface June 11 as overdue — the bill didn't exist for that cycle, so it isn't owed for it. The walk advances to July 11 (the first cycle on or after creation), which makes the bill derive to `UPCOMING` / `PAID` depending on calendar position. Without this guard, mid-month additions with a past-day due-day flash as `OVERDUE` from the moment they're created.

**Implementation:** `computeNearestUnpaidDueDate(dueDayOfMonth, instances, today, createdAt?)` in [src/features/bills/bills-helpers.ts](src/features/bills/bills-helpers.ts). `createdAt` is optional only for legacy call sites; production callers (state derivation, payment recording, Pay dialog) always pass it.

**UI contract:** any UI that triggers a payment must display which `dueDate` the payment is being applied to *before* the user confirms. The Pay confirmation dialog (dashboard, action panel) shows `"Applying to: {formattedDueDate}"`. Skipping this contract risks the user paying for a cycle they didn't intend.

---

## Historical Payment Cycle Selection

The **Log Historical Payment** flow constrains `dueDate` so that every written instance corresponds to a canonical cycle the derivation walk can see. Free-form dates are not accepted: every `dueDate` written by this flow equals `clampDayToMonth(dueDayOfMonth, y, m)` for some `(y, m)`.

The drawer operates in one of two modes:

1. **Catch-up mode** — if any cycle between `createdAt` and today's month is unpaid, the UI offers those cycles in a dropdown (oldest first, oldest pre-selected). Computed by `computeEligibleHistoricalCycles(dueDayOfMonth, instances, today, createdAt)`. Future cycles are never offered — those go through Mark Paid, which uses nearest-unpaid.

2. **Extend-history mode** — if every cycle from `createdAt` forward is already paid, the UI shows a single cycle one calendar month before the oldest instance's `dueDate`, clamped via the date-math rule. Confirming logs it; reopening offers the cycle before *that*. This is a record-keeping path for users who want a complete ledger predating when they added the bill, not a "fix a missed cycle" path. Computed by `computeExtendedHistoricalCycle(dueDayOfMonth, instances)`.

Catch-up takes precedence: while any unpaid in-range cycle exists, extend mode is unavailable. This avoids sparse ledgers where a user skips a known gap to log even older history.

If the bill has no instances and no eligible in-range cycles (only possible for a bill created in the future, which the UI doesn't allow), the drawer disables submission.

**Why constrain it:** free-form `dueDate` entry let users save instances whose `dueDate` didn't match any cycle the derivation walk asks about. Those instances are invisible to state derivation — the bill stays `MISSED_SCHEDULE` / `OVERDUE` forever despite the recorded payment, and they show up as orphaned rows in the ledger UI.

**Implementations:** `computeEligibleHistoricalCycles` and `computeExtendedHistoricalCycle` in [src/features/bills/bills-helpers.ts](src/features/bills/bills-helpers.ts). Tests in [src/features/bills/bills-helpers.test.ts](src/features/bills/bills-helpers.test.ts).

---

## Date Math Rule

Always compare `today.getDate()` against `Math.min(daysInCurrentMonth, targetDay)`, never against the raw `dueDayOfMonth` / `payDate`.

This means a bill due on the 31st is correctly treated as due on the 28th in February without special-casing. `clampDayToMonth(day, year, month)` in `bills-helpers.ts` does this.

The rule applies anywhere you compare a stored day-of-month against the calendar — state derivation, schedule selection, sorting by "upcoming this month," etc.

---

## Bill State Derivation

Each bill is in exactly one of four computed states at any moment, computed by `deriveBillState(bill, schedule, instances, today)`.

| State | Condition |
|---|---|
| `PAID` | The nearest unpaid date is in a future month relative to `today` (i.e., every cycle through this month is on the ledger) |
| `OVERDUE` | Unpaid for the current cycle, and `today.getDate() > clampDayToMonth(dueDayOfMonth)` |
| `MISSED_SCHEDULE` | Unpaid, bill is on an active schedule, and `today.getDate() > clampDayToMonth(payDate)` while still `<= clampDayToMonth(dueDayOfMonth)` |
| `UPCOMING` | None of the above — unpaid and neither pay date nor due day has passed |

**`MISSED_SCHEDULE` semantics:** signals "the user's planned pay session passed but the bill isn't technically late yet." It only fires when `payDate < dueDayOfMonth` (pay-ahead schedules). If `payDate == dueDayOfMonth`, the state goes straight `UPCOMING → OVERDUE` with no intermediate window — intentional, not a bug. `OVERDUE` is the meaningful label when pay date and due day coincide.

**State derivation is calendar-relative.** It answers "where does this bill stand on today's calendar." The dashboard's active session checklist uses a different — session-relative — question for actionability (see [docs/pages/dashboard.md](docs/pages/dashboard.md)).

---

## Active Schedule Selection (Earliest Unfinished Session)

The dashboard and Bill Actions drawer both need to identify which schedule represents the user's *current pay session*. Rule:

For each active schedule, compute `currentSession`:
- If any bill on the schedule has an unpaid target cycle → `currentSession` = the most recent past pay date occurrence
- Else → `currentSession` = the next future pay date occurrence

**Active schedule** = the schedule with the earliest `currentSession` date. Ties broken by `payDate` ascending, then `name` ascending.

This rule means a schedule with unfinished work *stays* the active one even after the calendar moves past its pay date. Sessions queue chronologically; they don't fragment between rows when calendar pay dates pass.

A bill on a schedule where the cycle paid in this session may differ from this calendar month — e.g., a bill due the 1st paid on a 15th-pay-date schedule pays for *next* month's 1st. The session's target dueDate is `computeNearestUnpaidDueDate(bill, instances, today)` per bill, which may resolve to a future month.

---

## Auto-Pay Treatment

`isAutoPay` is **informational only.** Auto-pay bills:

- Use the same state derivation as manual bills
- Need a `bill_instance` recorded to be considered paid — the ledger is still the source of truth
- Render with a small visual indicator (the teal check icon) so the user knows it's hands-off, but actionability and state are otherwise identical

The user is expected to mark auto-pay bills paid after the charge clears. The alternative — treating `isAutoPay && today >= dueDay` as implicitly paid — was considered and rejected: it diverges from the ledger-as-source-of-truth principle and silently masks failed auto-charges.

---

## Orphaned Bills

A bill with `payScheduleId` pointing at an archived (`isActive = false`) schedule is **orphaned**. Surfaced via the `isOrphaned` flag on `BillWithSchedule`. State derivation treats an orphaned bill the same as an unassigned one (schedule is null for the purposes of `MISSED_SCHEDULE` — that state requires `payScheduleId` and an *active* schedule).

UI surfacing:
- Bills page: amber `(inactive)` text after the schedule name
- Schedules page Unassigned pool: orphans grouped here
- Bill Actions drawer: orphans appear under attention or upcoming based on their derived state, no special tag

Restoring or reassigning the schedule resolves the orphan automatically — no migration required.

---

## Double-Payment Prevention

`UNIQUE(billId, dueDate)` on `bill_instances` is the last line of defense against accidental double-recording (race conditions across tabs/devices, retried server calls, etc.).

Server functions that record payments catch the constraint violation and throw `ConflictError`. The UI surfaces this inline on the Pay confirmation dialog and the Log Historical Payment drawer — the user sees that the cycle is already recorded and can cancel.

Frontends should also disable Pay buttons optimistically after the first click in the same session.

---

## Multi-Device / Stale Data

TanStack Query handles SWR. Any mutation invalidates the relevant query keys so other tabs/devices catch up on next focus or interval. Specific invalidation patterns are defined per-hook in `*-queries.ts`.

Schedule-level mutations (archive/restore/delete) must invalidate `billKeys.lists()` and `billKeys.details()` because the schedule's `isActive` flag is part of every bill's joined data — leaving bill caches stale produces phantom orphan states.

---

## Reference Implementations

- **State derivation + nearest-unpaid + date-math:** [src/features/bills/bills-helpers.ts](src/features/bills/bills-helpers.ts)
- **Tests for the pure helpers:** [src/features/bills/bills-helpers.test.ts](src/features/bills/bills-helpers.test.ts)
- **Active schedule selection:** to be implemented as part of the dashboard build (see [docs/pages/dashboard.md](docs/pages/dashboard.md))
