# Dashboard Page

**Route:** `/dashboard`
**Auth:** Required (`/_authenticated`)

---

## Workflow framing

The dashboard is the daily action surface. The user's primary question is *"What do I need to deal with today, and how much have I already taken care of this month?"*

It's an **assembled view** — all data comes from existing queries, all state is derived JIT in memory from the bill blueprints + this month's payment ledger. No new server functions. No persisted dashboard state.

---

## Layout

Four full-width rows, top to bottom. Some rows hide entirely when empty.

### Header

`h1` reads `"Today, {weekday, month day}"` (e.g. `"Today, Wednesday, June 15"`). Anchors the user temporally and makes the JIT state decisions feel less abstract.

### Row 1 — Attention Banner

Full width. **Collapses entirely when empty.**

A single-line banner — not a bill list. The actual list of attention-needing items lives in the global Bill Actions drawer (see [actions.md](actions.md)); this banner just nudges the user toward it.

Content: `"{N} bill{s} need your attention"` + a `Review →` button that opens the Bill Actions drawer (sets the root search param `?actions=true`).

`N` is the count of bills that are `OVERDUE` ∪ `MISSED_SCHEDULE` where the bill's schedule is not the active session.

Styling: `bg-chill-peach border border-chill-peach-border` card with the text + button inline. Keep it visually quiet — this is a notification, not a panel.

**Promote to app-wide during this build.** The attention banner shouldn't only live on the dashboard — if the conditions for it are met, the user should see it on any authenticated route. Implementation: hoist the banner into `_authenticated.tsx` (or `AppLayout`) and render it when `attentionCount > 0`. The `BillActionsProvider` already supplies the count app-wide. The dashboard-specific Row 1 slot then becomes "this banner happens to render at the top of the dashboard because it renders at the top of every authenticated route" — no dashboard-specific rendering needed.

### Row 2 — Monthly Snapshots (50% / 50%)

Two side-by-side `<Card>`s. Always rendered, never hides — these are the user's at-a-glance budget pulse for the month.

Both metrics are **calendar-month-scoped**: a `bill_instance` "counts toward" the month its `dueDate` falls in (e.g. an instance with `dueDate = 2026-07-01` paid on June 28 is a *July* payment).

**Left card — Bill count progress:**

- Donut chart: `paidCount / totalActiveBillsThisMonth`
- Center label: `"{paidCount} / {totalCount}"`, sub-label `"bills paid"`
- Use `chill-teal` fill on `chill-teal-light` track

**Right card — Dollar burndown:**

- Same donut shape, fill = `paidDollars / expectedDollars`
- Center label: `formatCurrency(paidDollars)`, sub-label `"of {formatCurrency(expectedDollars)}"`
- Same color tokens

`totalActiveBillsThisMonth` is `bills.length` (every active bill has one cycle per month). `expectedDollars` is `sum(amountExpected)` over those bills.

`paidCount` is the number of bills with a current-month instance. `paidDollars` is `sum(amountActual)` over those instances.

### Row 3 — Active Session Checklist

Full width.

Shows **all bills tied to the active pay session's schedule** — paid, unpaid, overdue, missed, all of them. Not just unpaid. Rationale: users want visual confirmation that nothing is missing from their checklist, which only works if the whole set is on screen.

**Selecting the active schedule (earliest unfinished session rule):**

For each active schedule, compute `currentSession`:

- If any bill on the schedule has an unpaid target cycle (see "session-relative payment state" below) → `currentSession` = the most recent past anchor occurrence
- Else → `currentSession` = the next future anchor occurrence

Active schedule = the one with the earliest `currentSession` date. Ties broken by `anchorDay` ascending, then `name` ascending.

This rule means: if you're mid-session on schedule A and the next schedule B's anchor day has technically arrived, schedule A stays in Row 3 until you finish it. Schedule B's bills wait their turn. Sessions queue up chronologically instead of fragmenting between rows when calendar anchors pass.

Card header: `"Pay Session — {schedule.name} ({formatOrdinal(schedule.anchorDay)})"`.

**Session-relative payment state.**

For each bill in the checklist, the "is this paid" question is about the *target cycle for this session*, not the most recent past calendar cycle. Compute per bill:

```
targetDueDate = computeNearestUnpaidDueDate(bill.dueDayOfMonth, instances, today)
```

The checkbox is filled iff an instance exists for `targetDueDate`. Since `nearestUnpaidDueDate` returns the first cycle without an instance, the checkbox is effectively always empty until the user pays — at which point a new instance is created for `targetDueDate` and the next call returns the cycle after that.

This makes pay-ahead workflows work: bill due 1st on a schedule anchored 15th, paying on Feb 15 for the March 1 cycle. The dashboard Pay dialog shows `"Applying to: 2026-03-01"` regardless of where the calendar happens to fall.

**State styling per bill row** (uses calendar-relative state from `deriveBillState` for visual cues only — actionability is session-relative as above):

| Element | Behavior |
|---|---|
| Checkbox | Filled iff an instance exists for `targetDueDate`. Clicking an empty box opens the Pay confirmation dialog. Clicking a filled box does nothing (corrections go through bill detail). |
| Bill name | Click navigates to detail. Strike-through when checkbox is filled. |
| Day | Ordinal `dueDayOfMonth`, muted. |
| Amount | `formatCurrency(amountExpected)`. Right-aligned, tabular. |
| Auto indicator | If `isAutoPay`, render the existing teal check icon next to the amount. Bills still need to be marked paid the same way — auto-pay is purely informational. |

**Row state styling:**

- `PAID` → muted text, struck-through name, no row background
- `UPCOMING` → normal text
- `MISSED_SCHEDULE` → `bg-amber-50 border-l-2 border-amber-400`
- `OVERDUE` → `bg-chill-peach border-l-2 border-chill-peach-border` (matches Row 1 alert language so the visual signal carries across)

**Empty states (mutually exclusive):**

- *No active schedules at all* → `"No active pay schedules. Create one to start a pay session."` with a link to `/schedules`
- *Active schedules exist but every bill on the next-upcoming is `PAID`* → `"All caught up for {schedule.name}!"`

### Row 4 — Upcoming Preview

Full width.

A **preview** of upcoming bills — the first 7 `UPCOMING` bills sorted by `dueDayOfMonth` ascending. Scoped to the current calendar month.

Includes bills assigned to any schedule (including the active one — intentional, this is a reference list), plus unassigned and orphaned bills.

Columns: `Day | Bill | Amount | Pay`. Same Pay button → same confirmation dialog as Row 3. Click bill name navigates to detail.

Footer link: `"See all upcoming →"` opens the Bill Actions drawer (`?actions=true`).

Empty state: hide the preview entirely if there are no upcoming bills this month. The drawer surface handles the empty-app case.

---

## Pay Confirmation Dialog

Shared component used by Row 1, Row 3 (empty-checkbox click), and Row 4.

`AlertDialog` (not a drawer — quick action, no multi-step).

**Body:**

- Header: `"Mark {bill.name} as paid"`
- Read-only line: `"Applying to: {formatted(nearestUnpaidDueDate)}"` — surfaces what cycle the payment is recording. Per CLAUDE.md, the UI must always display this before confirm.
- Amount input (`type="number"`, step `0.01`) prefilled with `(amountExpected / 100).toFixed(2)`. Editable — user may have paid more or less.

**Footer:** `Cancel` + `Confirm payment`.

On confirm → `useRecordBillPayment().mutateAsync({ billId, amountActual })`.

**Conflict handling:** if the server returns `ConflictError` (UNIQUE `(billId, dueDate)` violation — race with another device), show the error message inline above the footer. Don't close the dialog. The user can cancel out.

**Editing the applied date is intentionally not supported here.** Users paying for a *different* date (catching up late, paying ahead) go through bill detail's "Log Historical Payment" drawer. Keeps the dashboard dialog single-purpose and fast.

---

## Data Dependencies

All from existing hooks — no new server functions.

| Hook | Purpose |
|---|---|
| `useBills({ scheduleId: 'all', manualOnly: false })` | All active bill blueprints |
| `usePaySchedules()` | Active schedules — used to pick the next-upcoming |
| `useCurrentMonthInstances()` | Payment ledger for this month — drives state derivation, snapshot metrics |
| `useRecordBillPayment()` | Pay button confirmation dialog |

In-memory derivation:

1. Build `instancesByBillId: Map<string, BillInstance[]>` once
2. For each schedule, compute its `currentSession` (using the rule in Row 3)
3. Pick the active schedule by earliest `currentSession`
4. For each bill, compute calendar-relative state via `deriveBillState(bill, schedule, instances, today)` for visual styling
5. For bills on the active schedule, compute session-relative `targetDueDate` and a `targetIsPaid` flag

Group bills into:

- `attentionCount` (for Row 1 banner): bills where state is `OVERDUE`, plus bills where state is `MISSED_SCHEDULE` and the bill's schedule is *not* the active schedule. Just a count — the full list lives in the action drawer.
- `activeChecklist`: bills where `payScheduleId === activeSchedule.id` (all states). Each rendered with calendar-state styling + session-state checkbox.
- `upcomingPreview`: bills with state `UPCOMING` and `dueDayOfMonth` falling on or after today within the current calendar month, sliced to the first 7.

A bill assigned to the active schedule that is OVERDUE will count toward the Row 1 attention banner *and* appear in Row 3 (with peach row highlight) *and* in the drawer's Needs Attention section. Intentional — the user can act from whichever surface they're looking at.

---

## Today / Midnight Refresh

State derivation depends on `today`. If the user leaves the dashboard open overnight, the derived states go stale.

Implementation: a single `useEffect` in the dashboard root computes ms-until-next-local-midnight, sets a `setTimeout` that bumps a `today` state, then re-schedules. Cleanup clears the timeout on unmount. The `today` value is passed down to all row components.

```tsx
const [today, setToday] = React.useState(() => new Date());
React.useEffect(() => {
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  const t = setTimeout(() => setToday(new Date()), next.getTime() - Date.now());
  return () => clearTimeout(t);
}, [today]);
```

The `[today]` dep ensures re-scheduling after each bump.

---

## Auto-Pay Treatment

`isAutoPay` is **informational only** on the dashboard. Auto-pay bills:

- Appear in the same lists as manual bills (no `manualOnly: true` filter)
- Render an "Auto" icon next to the amount (the existing teal check from `bills/index.tsx`)
- Need a `bill_instance` recorded to be considered `PAID` — same JIT semantics. The user is expected to mark them paid after the auto-charge clears

Treating auto-pay as a separate workflow added complexity without a clear win — payment is payment, the instance ledger is the source of truth.

---

## Route Files

- `src/routes/_authenticated/dashboard.tsx` — replace the placeholder; add loader pre-warming the three queries above

---

## Loader

```ts
loader: ({ context }) =>
  Promise.all([
    context.queryClient.ensureQueryData(
      billsQueryOptions({ scheduleId: 'all', manualOnly: false }),
    ),
    context.queryClient.ensureQueryData(paySchedulesQueryOptions()),
    context.queryClient.ensureQueryData(currentMonthInstancesQueryOptions()),
  ]),
```

`currentMonthInstancesQueryOptions` does not yet exist — it needs to be extracted from `useCurrentMonthInstances` following the pattern used for the other loader-backed hooks. Small refactor; add it alongside dashboard build.

---

## Future Considerations

Captured centrally in [../future.md](../future.md) under the **Dashboard** section.
