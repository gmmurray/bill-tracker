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

When a new calendar month begins, the "reset" happens implicitly: there's no instance for the new month's cycle yet, so that cycle derives to `SCHEDULED` (then `DUE_NOW` / `OVERDUE` once the relevant date passes).

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

**UI contract:** any UI that triggers a payment must display which `dueDate` the payment is being applied to *before* the user confirms. Skipping this contract risks the user paying for a cycle they didn't intend.

**Prefer naming the cycle over inferring it.** `recordBillPayment` accepts an explicit `dueDate` and validates it against `assertCanonicalCycle`; nearest-unpaid is only the fallback when the caller omits it. The dashboard and drawer render one row per cycle, so the row the user clicked *is* the cycle recorded. Inference is a liability here: the client derives from a bounded ledger window while the server reads the whole table, so the two can disagree about which cycle is next.

---

## Historical Payment Cycle Selection

The **Log Historical Payment** flow constrains `dueDate` so that every written instance corresponds to a canonical cycle the derivation walk can see. Free-form dates are not accepted: every `dueDate` written by this flow equals `clampDayToMonth(dueDayOfMonth, y, m)` for some `(y, m)`.

The drawer operates in one of two modes:

1. **Catch-up mode** — if any cycle between `createdAt` and today's month is unpaid, the UI offers those cycles in a dropdown (oldest first, oldest pre-selected). Computed by `computeEligibleHistoricalCycles(dueDayOfMonth, instances, today, createdAt)`. Future cycles are never offered — those go through Mark Paid, which uses nearest-unpaid.

2. **Extend-history mode** — if every cycle from `createdAt` forward is already paid, the UI shows a single cycle one calendar month before the oldest instance's `dueDate`, clamped via the date-math rule. Confirming logs it; reopening offers the cycle before *that*. This is a record-keeping path for users who want a complete ledger predating when they added the bill, not a "fix a missed cycle" path. Computed by `computeExtendedHistoricalCycle(dueDayOfMonth, instances)`.

Catch-up takes precedence: while any unpaid in-range cycle exists, extend mode is unavailable. This avoids sparse ledgers where a user skips a known gap to log even older history.

If the bill has no instances and no eligible in-range cycles (only possible for a bill created in the future, which the UI doesn't allow), the drawer disables submission.

**Why constrain it:** free-form `dueDate` entry let users save instances whose `dueDate` didn't match any cycle the derivation asks about. Those instances are invisible to derivation — the cycle stays `OVERDUE` forever despite the recorded payment, and they show up as orphaned rows in the ledger UI. `assertCanonicalCycle` enforces the same constraint server-side for any caller that names a cycle explicitly.

**Implementations:** `computeEligibleHistoricalCycles` and `computeExtendedHistoricalCycle` in [src/features/bills/bills-helpers.ts](src/features/bills/bills-helpers.ts). Tests in [src/features/bills/bills-helpers.test.ts](src/features/bills/bills-helpers.test.ts).

---

## Date Math Rule

Always compare `today.getDate()` against `Math.min(daysInCurrentMonth, targetDay)`, never against the raw `dueDayOfMonth` / `payDate`.

This means a bill due on the 31st is correctly treated as due on the 28th in February without special-casing. `clampDayToMonth(day, year, month)` in `bills-helpers.ts` does this.

The rule applies anywhere you compare a stored day-of-month against the calendar — state derivation, schedule selection, sorting by "upcoming this month," etc.

---

## The Outlook — Bill-Cycle Derivation

The unit of derived state is a **bill-cycle**, not a bill. A bill contributes one entry per billing cycle inside the horizon, so a bill settled for August and owed for September is represented as *both*, rather than collapsing into a single ambiguous "paid".

For each bill, independently — there is no global selection step:

```
cycleDueDate — a calendar occurrence of dueDayOfMonth (clamped per the date-math rule)
payByDate    — the latest occurrence of the bill's schedule payDate at or before
               cycleDueDate; equal to cycleDueDate when the bill has no active schedule
status       — today compared against those two dates
```

**Horizon:** the current month's occurrence and the next month's. Cycles predating `bill.createdAt` are skipped, mirroring the guard in [Nearest Unpaid Date Logic](#nearest-unpaid-date-logic).

| Status | Condition |
|---|---|
| `PAID` | An instance exists for this `cycleDueDate` |
| `OVERDUE` | Unpaid and `today > cycleDueDate` |
| `DUE_NOW` | Unpaid and `payByDate <= today <= cycleDueDate` |
| `SCHEDULED` | Unpaid and `today < payByDate` |

`DUE_NOW` is the state formerly called `MISSED_SCHEDULE`. Same condition, actionable framing: the pay date has arrived, the vendor deadline has not. When `payDate == dueDayOfMonth` the status goes straight `SCHEDULED → OVERDUE` with a single-day `DUE_NOW` window on the due date itself.

**Orphaned bills derive as unscheduled** — an archived schedule contributes no `payDate`, so `payByDate` falls back to `cycleDueDate`.

**Buckets.** Cycles group into `OVERDUE`, `DUE_NOW`, `THIS_MONTH`, `NEXT_MONTH`. The first two are defined by status; the last two by the calendar month of `cycleDueDate`. Consequently `THIS_MONTH` and `NEXT_MONTH` only ever hold `SCHEDULED` and `PAID` cycles — **nothing in them is actionable today**, which is what lets the UI collapse them by default without hiding anything actionable.

**Nothing is filtered.** `buildBillOutlook` emits every in-horizon cycle of every active bill. Surfaces group and order; they never drop. This is the property the model exists to guarantee.

### Why there is no "active schedule"

An earlier model picked one winning schedule (the earliest unfinished pay session) and scoped the dashboard to it. It was removed because the selection was load-bearing in ways that silently lost data:

- A bill overdue on a *non-winning* schedule appeared on no surface at all.
- Session completeness asked whether an instance existed at a session-relative target cycle. Once that cycle was in the past, `computeNearestUnpaidDueDate` — which never walks backward — could not produce it, so **Mark Paid could never complete the session** and the schedule held the slot indefinitely, masking every other schedule.
- Session-relative and calendar-relative notions of "paid" disagreed, so a fully-owed pay-ahead session could render as "All caught up".

Per-bill `payByDate` has no selection step, so none of these failure modes have anywhere to live. Schedules are a grouping and labelling device in the UI (tab strip), never a gate.

---

## Auto-Pay Treatment

`isAutoPay` is **informational only.** Auto-pay bills:

- Use the same state derivation as manual bills
- Need a `bill_instance` recorded to be considered paid — the ledger is still the source of truth
- Render with a small visual indicator (the teal check icon) so the user knows it's hands-off, but actionability and state are otherwise identical

The user is expected to mark auto-pay bills paid after the charge clears. The alternative — treating `isAutoPay && today >= dueDay` as implicitly paid — was considered and rejected: it diverges from the ledger-as-source-of-truth principle and silently masks failed auto-charges.

---

## Orphaned Bills

A bill with `payScheduleId` pointing at an archived (`isActive = false`) schedule is **orphaned**. Surfaced via the `isOrphaned` flag on `BillWithSchedule`. Derivation treats an orphaned bill the same as an unassigned one: `effectivePayDate` returns `null`, so `payByDate` collapses to `cycleDueDate` and the bill can never sit in `DUE_NOW` ahead of its own deadline.

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

## Ledger Fetch Window

`listRecentInstances` returns instances whose `dueDate` falls in the **previous, current, or next** month. Next month is not optional: pay-ahead writes instances with future `dueDate`s, and every client-side derivation treats a missing instance as unpaid. A narrower window makes the client believe a settled cycle is still owed while the server, reading the full ledger, disagrees.

Any change to the outlook horizon must widen this window to match.

---

## Reference Implementations

- **Outlook derivation (cycles, pay-by, status, buckets):** [src/features/bills/bills-outlook.ts](src/features/bills/bills-outlook.ts) · tests in [bills-outlook.test.ts](src/features/bills/bills-outlook.test.ts)
- **Nearest-unpaid, date-math, historical cycles, cycle validation:** [src/features/bills/bills-helpers.ts](src/features/bills/bills-helpers.ts) · tests in [bills-helpers.test.ts](src/features/bills/bills-helpers.test.ts)
- **Shared outlook context:** [src/components/bill-outlook-provider.tsx](src/components/bill-outlook-provider.tsx) — the dashboard, banner, and drawer all read one derivation
