# Dashboard Page

**Route:** `/dashboard`
**Auth:** Required (`/_authenticated`)

---

## Workflow framing

The dashboard answers two questions and refuses to answer any others by hiding things:

1. **What can I pay right now?**
2. **How far through the month am I?**

Its governing constraint is that **nothing is ever filtered out**. Every active bill appears, once per billing cycle in the horizon. Sections group and order; they never drop. A user must be able to confirm that the list is the whole set — that guarantee is the reason the page exists in this form.

All state is derived in memory by `buildBillOutlook` (see [../business-logic.md](../business-logic.md#the-outlook--bill-cycle-derivation)). No new server functions, no persisted dashboard state.

---

## Layout

### Header

`h1` reads `"Today, {weekday, month day}"`, with the subtitle `"Everything due through the end of next month."` — the subtitle states the horizon so the list's boundaries are explicit rather than inferred.

### Stat cards (two, half-width)

- **Owed now** — `OVERDUE + DUE_NOW` totals, in dollars and bill count. Reads `"Nothing due"` when clear; this is the page's only persistent all-clear signal, since the banner hides itself when there's nothing to report. Takes `chill-peach` styling when anything is overdue.
- **Settled this month** — dollars settled, `n/m` cycle count, and a `chill-teal` progress bar over the month's total. Scoped to cycles whose `cycleDueDate` falls in the current calendar month, derived from the same cycle list the sections render.

There were formerly three cards. An aggregate across the whole horizon was removed: its window ran from roughly four to nearly nine weeks depending on the date, so it roughly doubled at each month rollover with no change in the underlying bills, and it merely re-summed totals already printed in the section headers.

### Schedule tabs

`All` (default) plus one tab per active schedule, plus `Unassigned` when any unassigned or orphaned bill exists. Each tab carries a count of owed cycles.

Tabs filter the rendered list, but `All` is the default and every tab shows its count, so no tab is load-bearing. Selection lives in the `tab` search param, which is **optional** — `/dashboard` with no params means `All`, keeping the PWA start URL clean.

### Sections

Four, in urgency order: `Overdue`, `Pay now`, `This month`, `Next month`.

Each header shows the label, a count badge of owed cycles, and a total — owed dollars, or `"{n} settled · {amount}"` when nothing is left.

**Sections open by default only when they hold something actionable today.** Since `THIS_MONTH` and `NEXT_MONTH` structurally cannot contain `OVERDUE` or `DUE_NOW` cycles, they always start collapsed; `Overdue` and `Pay now` always start expanded. Collapsing hides rows, never their existence — the count and total stay on the header.

A section re-applies its default when it crosses the actionable boundary, so settling the last actionable row folds it away and a newly-owed cycle springs it open.

### Row

Bill name (links to detail, struck through when settled), an auto-pay icon when applicable, a timing line, the amount, and either `Mark Paid` or a `Paid` badge. A left border accent marks `OVERDUE` (coral) and `DUE_NOW` (amber).

The timing line always names the actual cycle date:

| Status | Text |
|---|---|
| `PAID` | `Settled for {due}` |
| `OVERDUE` | `Due {due} · {n} days late` |
| `DUE_NOW` / `SCHEDULED` | `Pay date {payBy} · due {due}`, or `Due {due}` when unscheduled |

Rows deliberately carry **no schedule name**. The pay date conveys which session a bill belongs to, and the tab strip carries schedule identity; re-labelling every row reintroduces the "which session am I in" question this design removes.

### Footer

`"{n} cycles across {m} bills, through {date}."` — a countable claim the user can check against the rows, not a reassurance.

---

## Pay Cycle Dialog

`AlertDialog`. Shows the cycle being recorded, the pay date when it differs, and an editable amount prefilled from `amountExpected`.

The dialog records **the cycle from the row that opened it**, passing `dueDate` explicitly to `recordBillPayment`. Nothing is inferred at confirm time. Its predecessor recomputed nearest-unpaid from a bounded client-side ledger and could therefore name a cycle the server would not actually write.

Conflicts (`UNIQUE(billId, dueDate)`) surface inline; the dialog stays open.

Paying a cycle outside the horizon still goes through **Log Historical Payment** on the bill detail page.

---

## Data Dependencies

All read through `BillOutlookProvider`, which owns the single derivation shared with the banner and drawer.

| Hook | Purpose |
|---|---|
| `useBills({ scheduleId: 'all', manualOnly: false })` | All active bill blueprints |
| `usePaySchedules()` | Active schedules — the tab strip |
| `useRecentInstances()` | Ledger for previous, current, and next month |
| `useRecordBillPayment()` | Pay dialog |

The route loader pre-warms all three queries.

---

## Today / Midnight Refresh

`BillOutlookProvider` holds `today` in state and schedules a `setTimeout` for the next local midnight, re-scheduling after each bump. Because every surface reads `today` from that one provider, the dashboard, banner, and drawer can't drift apart overnight.

---

## Future Considerations

Captured centrally in [../future.md](../future.md) under the **Dashboard** section.
