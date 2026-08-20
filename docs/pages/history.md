# Payment History Page

**Route:** `/history`
**Auth:** Required (`/_authenticated`)
**Status:** Spec — not yet built

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

Rows are grouped by the calendar month of `paidAt`, with a divider row at each boundary:

```
─── August 2026 ──────────────────────────
```

**Label only. No per-month total.** A month straddles page boundaries constantly, and a header summing only the rows visible on the current page is a wrong number presented as a right one. Real month totals need their own aggregate query — deferred, see Future.

### Table (desktop) / card list (mobile)

Follows the responsive split already used on `/bills`: `<table className="hidden md:table">` plus a `<ul className="md:hidden">` of cards.

| Column | Content |
|---|---|
| — | Selection checkbox |
| Paid | `paidAt`, formatted `MMM d, yyyy` |
| Bill | `bill.name` — links to `/bills/$billId` |
| Cycle | `dueDate`, the cycle this settled |
| Amount | `formatCurrency(amountActual)`, right-aligned, `tabular-nums` |

Both dates are shown because they routinely differ, and the gap is the interesting part — a payment made Aug 15 settling the Sep 1 cycle is the app's core pay-ahead behaviour made legible.

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
- **Date range** — first and last `paidAt` in the selection. Nearly free, and it frames the total: a sum over an unknown span is not much of an answer.
- **Show only** — toggles the list to render exactly the selected rows. Reads `Show all` when active.
- **Clear** — drops the whole selection.

The bar uses `chill-purple` (selection is the one job that colour has).

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

**Header checkbox selects the current page only**, and is labelled `Select page` rather than `Select all` — with cross-page selection live, "all" is ambiguous and would imply reaching rows the client has never seen. Its checked state is derived from whether every row on this page is in the map, with an indeterminate state for partial.

**Selection is session state.** It clears on unmount and is not URL-encoded. A user returning to the page starts empty, which is the right default for a scratch calculation.

**Known edge:** deleting or editing an instance elsewhere (bill detail) leaves a stale copy in the selection map. Prune on query invalidation by dropping selected IDs absent from the refetched page — imperfect, since it can only check the current page, but it covers the realistic case of editing something you just selected. Accept the residue otherwise; the cost is a stale row in a scratch total, and `Clear` fixes it.

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
    // + COUNT(*) for the same WHERE
    return { rows, total };
  });
```

**Do not filter on `bills.isActive`.** Every other bill query in the service does, and copying one of them is the obvious way to build this — but archiving a bill must not erase its payment history. This is the single most likely bug in the implementation.

Scope on `billInstances.userId` directly (the column exists) rather than relying on the join, so the auth predicate doesn't depend on join semantics.

### Model

```ts
export type PaymentHistoryRow = BillInstance & {
  billName: string;
  billCategory: BillCategory | null;
  billIsActive: boolean;
};
```

### Query key and invalidation

Add `billKeys.history = (page: number) => [...billKeys.all, 'history', page]`.

Every instance mutation must invalidate it — `useRecordBillPayment`, `useLogHistoricalPayment`, `useUpdateBillInstance`, `useDeleteBillInstance`, and `useDeleteBill` (which cascades instances). All five already invalidate `recentInstances`; history goes alongside, and missing one leaves a payment absent from the ledger until a hard refresh.

Invalidate the whole `[...billKeys.all, 'history']` prefix, not one page — a new payment at the top shifts every subsequent page.

### Loader

```ts
loaderDeps: ({ search }) => ({ page: search.page }),
loader: ({ context, deps }) =>
  context.queryClient.ensureQueryData(paymentHistoryQueryOptions(deps.page)),
```

Page size **25** — larger than the bill detail ledger's 10, since this view has no other content competing for the screen.

---

## New primitive required

`src/components/ui/checkbox.tsx` — a Radix `Checkbox` wrapper. CLAUDE.md lists Checkbox among the UI primitives, but it was never actually built; every "checkbox" in the app to date has been a bare `<input type="checkbox">` (see the Add Another control in the bills quick-add drawer) or a `Switch`.

Needs an indeterminate state for the `Select page` header control.

---

## Navigation

Fifth item in the sidebar, after Schedules. Icon `FiClock`.

`NavLink`'s `to` union in `app-layout.tsx` must gain `'/history'`.

---

## Empty and edge states

| Case | Treatment |
|---|---|
| No payments at all | Card: *"No payments recorded yet."* with a link to `/dashboard` |
| `page` beyond the last page | Clamp to the last page rather than showing an empty table |
| Selection active, then `Clear` | Bar animates out; list returns to the current page |
| Single payment selected | Show the total, omit the date range — a range of one date reads as a bug |

---

## Explicitly not in v1

- **Filters** (by bill, schedule, category, date range). The whole page is a filter-free chronological read; add these only if scanning proves slow in practice.
- **Editing from this view.** Amount edits and deletions stay on bill detail, which already owns that UI. Rows link there.
- **CSV export.**
- **Real month totals.** Needs a grouped aggregate query — worth doing, but it is a distinct feature from select-and-sum.

---

## Future Considerations

Log deferred ideas in [../future.md](../future.md) under a **Payment History** section as they come up.
