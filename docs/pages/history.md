# Payment History Page

**Route:** `/history`
**Auth:** Required (`/_authenticated`)

---

## Workflow framing

A chronological ledger of **every payment recorded, newest first**, across all bills.

The question it answers is *"what have I actually been paying lately?"* — a cash-flow question, not a bill-management one. It is the only surface in the app organised by **time** rather than by bill or by cycle:

| Surface | Axis | Question |
|---|---|---|
| Dashboard | Cycle / urgency | What do I owe? |
| Bill detail | One bill | What has this bill cost me? |
| **History** | **Time** | **What have I paid recently?** |

Per-bill history already lives on the bill detail page and is not duplicated here. There is deliberately **no bill filter** in v1 — filtering by bill just reproduces the detail page.

The one analytical affordance is **select-and-sum**: tick a few rows, get a total. This exists because the recurring real question — *"what did those three loan payments come to?"* — currently requires a calculator.

---

## Sort order

```sql
ORDER BY paid_at DESC, due_date DESC, id DESC
```

`paidAt` is the axis, not `dueDate`. The user is asking when money left the account, not which cycle it settled. Backfilled entries sort into their true position because **Log Historical Payment** takes a user-supplied `paidAt`.

**The `id` tiebreak is load-bearing, not decoration.** Offset pagination over a non-total order lets rows duplicate across pages or vanish entirely. `paidAt` is not unique — `logHistoricalPayment` accepts an arbitrary timestamp, and a user backfilling six months will plausibly stamp several entries identically. Sort must be fully deterministic.

---

## Layout

### Header

Title `Payment History`, with a muted subtitle giving the corpus size: `"{total} payments recorded"`.

That count is a fact about the whole table, safe to state. Resist adding an all-time sum next to it — see *Totals that would be lies* below.

### Month dividers

Rows are grouped by the calendar month of `paidAt`, with a full-width divider at each boundary — a `bg-chill-bg` bar carrying the month label in uppercase `text-xs`, matching the section-header convention on the dashboard.

**Label only. No per-month total.** A month straddles page boundaries constantly, and a header summing only the rows visible on the current page is a wrong number presented as a right one. Real month totals need their own aggregate query — deferred, see Future.

Grouping assumes the input is already sorted by `comparePaymentHistoryRows`, so a month never reappears once its run ends. `groupPaymentHistoryByMonth` walks contiguous runs rather than bucketing into a map.

### Table (desktop) / card list (mobile)

Follows the responsive split already used on `/bills`: `<table className="hidden md:table">` plus a `<ul className="md:hidden">` of cards.

| Column | Content |
|---|---|
| — | Selection checkbox |
| Paid | `paidAt`, formatted `MMM d, yyyy` |
| Bill | `bill.name` — links to `/bills/$billId` |
| Cycle | `dueDate`, the cycle this settled — same `MMM d, yyyy` format |
| Amount | `formatCurrency(amountActual)`, right-aligned, `tabular-nums` |

Both dates are shown because they routinely differ, and the gap is the interesting part — a payment made Aug 15 settling the Sep 1 cycle is the app's core pay-ahead behaviour made legible. They share a format so the eye can compare them without re-parsing.

`dueDate` is noon-anchored on parse (`` `${dueDate}T12:00:00` ``) per the app-wide convention; `paidAt` is already a full timestamp.

Amount takes the row-anchor treatment established on the dashboard: `text-base font-semibold tracking-tight`.

Rows for **archived bills still appear** and still link to their detail page. History is history.

### Selection bar

Appears fixed to the bottom of the viewport whenever at least one row is selected:

```
┌────────────────────────────────────────────────────────┐
│  3 selected · Aug 1 – Aug 19 · $1,234.56               │
│                              [Show only]  [Clear]      │
└────────────────────────────────────────────────────────┘
```

- **Count and total** — the point of the feature.
- **Date range** — first and last `paidAt` in the selection. Nearly free, and it frames the total: a sum over an unknown span is not much of an answer. Omitted for a single-row selection, where a range of one date reads as a bug.
- **Show only** — toggles the list to render exactly the selected rows. Reads `Show all` when active.
- **Clear** — drops the whole selection.

The bar uses `chill-purple` (selection is the one job that colour has). The page container gains bottom padding while the bar is up, so it never covers the last row.

**Show only exits itself when the selection empties.** `Clear` is the obvious path, but unchecking rows one at a time reaches zero too, and without the fallback the view strands the user on an empty list with pagination hidden.

A short line under the page title — *"Select rows to total them up."* — states what selection does, since a bare column of checkboxes doesn't announce its own purpose.

### Footer

`← Previous` / `Page N of M` / `Next →`, matching the bill detail ledger footer exactly. `page` lives in a search param so the view is linkable and survives back-navigation.

Hidden while **Show only** is active — the selection is held in memory in full, so there is nothing to page through.

---

## Selection model

**Selection stores whole rows, not IDs:**

```ts
const [selected, setSelected] = React.useState<Map<string, PaymentHistoryRow>>(new Map());
```

Keyed by `instance.id`. This detail decides whether two features work at all:

1. **Selection persists across pages.** Summing is worthless if it can only reach the 25 rows currently on screen — "what did I pay these three lenders" spans pages by nature. An ID-only set would leave the sum uncomputable once a row scrolls out of cache.
2. **Show only needs no fetch.** Rendering the selection is a read of `selected.values()`, sorted by the same comparator. No query, no pagination, no possibility of disagreeing with the sum beside it.

The sum is derived, never stored: `[...selected.values()].reduce((s, r) => s + r.amountActual, 0)`.

**Header checkbox operates on whatever rows are currently visible** — the page normally, the selection in Show only mode. It's labelled `Select page` (`Select shown` in Show only), never `Select all`: with cross-page selection live, "all" is ambiguous and would imply reaching rows the client has never seen. Its checked state is derived from how many visible rows are in the map, with an indeterminate state for partial.

**Selection is session state.** It clears on unmount and is not URL-encoded. A user returning to the page starts empty, which is the right default for a scratch calculation.

### Reconciling against a refetch

Editing or deleting an instance elsewhere (bill detail) can leave the selection out of step with the ledger. On refetch **of the same page** — invalidation, not navigation — `reconcileSelection` does two things:

- **Refresh.** A selected row still present in the refetched page is replaced with its fresh copy when `amountActual`, `paidAt`, `dueDate`, or `billName` differs. Comparison is by field, not reference; a refetch always yields new objects and reference equality would churn the map every time. Without this, correcting a selected payment's amount leaves the old figure in the total.
- **Delete, conditionally.** A selected id that was on the previous page and is now missing is dropped **only when the ledger's total row count actually decreased**.

That condition is the subtle part. Absence is not evidence of deletion: recording a payment anywhere — the actions drawer is global and reachable from this page — pushes the page's last row onto the next page. Treating that as a deletion silently removes a live row from the selection and the total changes with no signal. **Dropping a valid selection is worse than keeping a stale one**, so absence must be corroborated by a shrinking count.

Reconciliation is gated on the page being unchanged. Without that guard, navigating pages would treat every row from the previous page as vanished and cross-page selection — the whole point of the feature — would collapse.

**Known residue:** delete one row and add another within the same interval and the count is unchanged, so the deleted row survives as a stale entry. Accepted; `Clear` fixes it.

Returns the same `Map` instance when nothing changed, so callers skip a re-render.

---

## Totals that would be lies

Three tempting totals must not be built as stated:

| Tempting | Why it's wrong |
|---|---|
| Month total in a divider | Sums only the rows on the current page |
| "Page total" in the footer | Real, but meaningless — a page is an arbitrary window |
| All-time total in the header | Needs a separate aggregate; summing fetched rows gives the current page |

The selection total is the only sum on this page, and it is exact because the client holds every row it is summing.

---

## Data

### Server function

`listPaymentHistory` in `bills-service.ts`:

```ts
export const listPaymentHistory = createServerFn({ method: 'GET' })
  .validator(listPaymentHistorySchema)   // { page?: number; pageSize?: number }
  .handler(async ({ data }) => {
    const { userId } = await requireAuth({ data: {} });
    // SELECT instance columns + bills.name, bills.category, bills.isActive
    // FROM bill_instances INNER JOIN bills ON bill_instances.bill_id = bills.id
    // WHERE bill_instances.user_id = ?
    // ORDER BY paid_at DESC, due_date DESC, id DESC
    // LIMIT ? OFFSET ?
    // + COUNT(*) over the same FROM/JOIN/WHERE
    return { rows, total };
  });
```

**Do not filter on `bills.isActive`.** Every other bill query in the service does, and copying one of them is the obvious way to build this — but archiving a bill must not erase its payment history.

Scope on `billInstances.userId` directly (the column exists) rather than relying on the join, so the auth predicate doesn't depend on join semantics.

**The count query carries the same join as the rows query.** It doesn't strictly need `bills` to count, but a count whose predicate can drift from the rows' predicate is a phantom trailing page waiting to happen.

### Model

```ts
export type PaymentHistoryRow = BillInstance & {
  billName: string;
  billCategory: BillCategory | null;
  billIsActive: boolean;
};
```

### Query key and invalidation

`billKeys.history = (page: number, pageSize: number) => [...billKeys.all, 'history', page, pageSize]`.

`pageSize` is part of the key, matching `billDetailQueryOptions`. Only one page size is in use today, but a key that omits a query argument is a cache collision waiting for a second call site.

Five mutations invalidate it — `useRecordBillPayment`, `useLogHistoricalPayment`, `useUpdateBillInstance`, `useDeleteBillInstance`, and `useDeleteBill` (which cascades instances). All five also invalidate `recentInstances`; history sits alongside, and missing one leaves a payment absent from the ledger until a hard refresh.

Invalidate the whole `[...billKeys.all, 'history']` prefix, not one page — a new payment at the top shifts every subsequent page.

### Route and loader

`page` is an **optional** search param (`z.number().int().positive().optional().catch(1)`), read as `const { page = 1 } = Route.useSearch()`. A required field would force every `<Link to="/history">` — the sidebar included — to pass a `search` prop.

The loader clamps out-of-range pages by throwing `redirect` to the last real page, so a stale bookmark lands somewhere useful rather than on an empty table. `clampPage` is idempotent, so the redirect can't loop.

Page size **25** — larger than the bill detail ledger's 10, since this view has no other content competing for the screen.

---

## Checkbox primitive

`src/components/ui/checkbox.tsx` — a Radix `Checkbox` wrapper, added for this page. It supports an indeterminate state for the `Select page` header control.

**The hit area is expanded to ~40px via a transparent `after:-inset-3` pseudo-element**, leaving the visible box at 16px. Radix renders `Root` as a `<button>`, so the pseudo-element extends its clickable region with no extra handlers. A 16px target is well under the ~44px guidance, and on the mobile card list the checkbox is the only way to select anything.

Any new checkbox usage inherits this. Give it at least 12px of clearance from adjacent interactive elements so the overhang doesn't collide.

---

## Navigation

Fifth item in the sidebar, after Schedules. Icon `FiClock`.

`NavLink`'s `to` union in `app-layout.tsx` includes `'/history'`.

---

## Empty and edge states

| Case | Treatment |
|---|---|
| No payments at all | Card: *"No payments recorded yet."* with a link to `/dashboard` |
| `page` beyond the last page | Loader redirects to the last real page |
| Query error | Error text; distinct from the not-yet-loaded branch, which renders nothing |
| Selection empties by any route | Bar disappears and Show only resets to the page view |
| Single payment selected | Show the total, omit the date range — a range of one date reads as a bug |

---

## Explicitly not in scope

- **Filters** (by bill, schedule, category, date range). The whole page is a filter-free chronological read; add these only if scanning proves slow in practice.
- **Editing from this view.** Amount edits and deletions stay on bill detail, which already owns that UI. Rows link there.
- **CSV export.**
- **Real month totals.** Needs a grouped aggregate query — worth doing, but it is a distinct feature from select-and-sum.
- **Whole-row click to select.** `/bills` already uses row-click to navigate to a bill; giving the same gesture a second meaning here means finding out which one you get by trying it. Selection stays on the checkbox, whose hit area is sized to compensate. If row-select is ever wanted, it should change both pages together.

---

## Future Considerations

Log deferred ideas in [../future.md](../future.md) under a **Payment History** section as they come up.
