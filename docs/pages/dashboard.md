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

### Row 1 — Critical Alerts

Full width. **Collapses entirely when empty.**

Surfaces bills in trouble:

- All `OVERDUE` bills (regardless of schedule assignment, including orphans)
- All `MISSED_SCHEDULE` bills **whose schedule is not the next-upcoming active schedule** (i.e., schedules that have already passed in the current cycle but whose bills weren't paid)

Bills `MISSED_SCHEDULE` on the next-upcoming active schedule are intentionally **excluded** here — they live in Row 3 with amber highlighting. Row 1 is the "you have to act on these or things break" pane; Row 3 is the work surface for the current pay session.

Rendered as a `<Card>` with `bg-chill-peach border-chill-peach-border`. Each row shows: bill name, ordinal due day, expected amount, **Pay** button. Clicking the bill name navigates to detail.

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

### Row 3 — Active Schedule Checklist

Full width.

Shows **all bills tied to the next-upcoming active pay schedule** — paid, unpaid, overdue, missed, all of them. Not just unpaid. Rationale: users want visual confirmation that nothing is missing from their checklist, which only works if the whole set is on screen.

**Selecting the "next-upcoming" schedule:**

- Filter active schedules to those whose `anchorDay >= today.getDate()` in the current month
- Sort by `anchorDay` ascending, then `name` ascending (tie-break)
- Pick the first
- If none qualify (all anchor days for the current month have passed), wrap to next month: smallest `anchorDay`, ties by name

Card header: `"Next Pay Session — {schedule.name} ({formatOrdinal(schedule.anchorDay)})"`.

Each bill row:

| Element | Behavior |
|---|---|
| Checkbox | Filled when state is `PAID`. Empty otherwise. Clicking an empty box opens the Pay confirmation dialog. Clicking a filled box does nothing (corrections go through bill detail). |
| Bill name | Click navigates to detail. Strike-through when `PAID`. |
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

### Row 4 — Master Timeline

Full width.

A simple, complete list of every **`UPCOMING`** bill, sorted by `dueDayOfMonth` ascending. Includes bills assigned to any schedule (including the active one — intentional duplication with Row 3 as a reference list), plus unassigned and orphaned bills.

No schedule filtering. No assumptions about pay schedules — a user without any schedules still sees a useful timeline here.

Columns: `Day | Bill | Amount | Pay`. Same Pay button → same confirmation dialog. Click bill name navigates to detail.

Empty state: `"No upcoming bills."`

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
2. For each bill, compute `deriveBillState(bill, schedule, instancesByBillId.get(bill.id) ?? [], today)`
3. Partition into the four row buckets

Group bills into:

- `alerts`: bills where state is `OVERDUE`, plus bills where state is `MISSED_SCHEDULE` and the bill's schedule is *not* the next-upcoming
- `activeChecklist`: bills where `payScheduleId === nextUpcoming.id` (all states)
- `timeline`: bills where state is `UPCOMING`

A bill assigned to the next-upcoming schedule that is OVERDUE will appear in both Row 1 (alert) and Row 3 (active checklist with peach highlight). Intentional.

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

## CLAUDE.md edits needed

Once the dashboard is built, these CLAUDE.md sections should be reconciled with what we actually built:

1. **Row 2 → now its own row** at 50/50 (snapshots), with the active checklist promoted to its own full-width row (Row 3). CLAUDE.md currently has the snapshot panel as a 1/3-width sidebar in row 2.
2. **Two snapshot metrics, not one.** Bill count progress AND dollar burndown — both useful, one isn't a replacement for the other.
3. **"No gamification" line stays.** The metrics are utilitarian (count of remaining tasks, dollar burndown), not progress-bar dopamine.
4. **Auto-pay handling needs a paragraph** added — currently CLAUDE.md mentions `isAutoPay` exists in the schema but doesn't say how the dashboard treats it. Decision: informational only.
5. **Pay confirmation dialog needs spec** — applied date is read-only, amount editable, no historical override (use bill detail for that).
6. **"Active schedule" selection rule** — anchorDay ascending, name ascending tie-break, wrap to next month if no current-month anchor matches.
7. **Checklist behavior on PAID rows** — show as checked + struck-through, inert (no un-check from the dashboard).
8. **Row 1 inclusion rule** — explicitly state it's `OVERDUE ∪ MISSED_SCHEDULE-where-schedule-is-not-next-upcoming`. The "past schedules that slipped through" wording is too vague.
9. **`MISSED_SCHEDULE` collapsing when `anchorDay == dueDayOfMonth`** — note that this is intentional, not a bug. OVERDUE is the meaningful state when anchor and due coincide.

---

## Future Considerations

- **Drag-and-drop to mark paid** — deferred; checkbox click is direct enough
- **Donut animation on payment** — small celebratory tick; nice but not required
- **Aggregate "amount due today" widget** — a third snapshot if we find the existing two leave a gap during use
- **Multi-month view / forecast** — explicitly out of scope, JIT paradigm doesn't model the future
