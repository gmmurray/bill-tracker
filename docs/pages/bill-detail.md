# Bill Detail Page

**Route:** `/bills/$billId`  
**Auth:** Required (`/_authenticated`)

---

## URL Params

| Param | Values | Purpose |
|---|---|---|
| `edit` | `true` \| omitted | Activates inline edit mode on the blueprint section |
| `page` | integer, default `1` | Pagination for the payment history ledger |

When navigating here from the quick-add drawer, the route is pushed with `?edit=true` so the user lands directly in edit mode to complete remaining fields.

---

## Layout

### Back Navigation

`← Back to Bills` link returning to `/bills`.

---

### Section 1 — Bill Blueprint Details

Displays the full bill metadata in a clean read-only grid:

- Name
- Expected amount
- Due day of month
- Pay schedule (name, or "Unassigned")
- Auto-pay status
- Payment URL (rendered as a link if present)
- Notes

**`[ Edit ]` button** — sets `?edit=true` in the URL, flipping the static display into React Hook Form input fields in place. All fields from `updateBillSchema` are exposed here (unlike the quick-add drawer which only captures name, amount, and due day).

**Edit mode** — button becomes `[ Save ]` / `[ Cancel ]`. Save triggers `updateBill` mutation. Cancel removes `?edit=true` and resets the form. On successful save, `?edit=true` is removed from the URL.

---

### Section 2 — Payment History Ledger

Header: "Payment History" on the left, `[ + Log Historical Payment ]` on the right.

Paginated table of `bill_instances` for this bill, ordered by `dueDate` descending. 10 rows per page. Pagination controls below the table (`← Previous` / `Next →` / `Page N of N`), driven by the `?page` URL param.

**Columns:**

| Column | Content |
|---|---|
| Cycle Due Date | `dueDate` (the normalized cycle date, e.g. "May 18, 2026") |
| Date Paid | `paidAt` timestamp (e.g. "May 14, 2026 08:32") |
| Amount Paid | `amountActual` formatted as currency |
| Actions | Edit amount button + Delete button |

**Edit amount button** — opens the responsive drawer with a single `amountActual` field. Submits via `updateBillInstance`. `paidAt` and `dueDate` are not editable through this form; to correct a cycle assignment, delete the record and re-log.

**Delete button** — triggers a confirmation dialog ("Delete this payment record? This cannot be undone."). On confirm, calls `deleteBillInstance` and invalidates the ledger.

---

### Log Historical Payment Drawer

Responsive: side drawer on desktop, full-screen sheet on mobile.

Use case: back-filling payment records for past cycles.

**Fields:**

| Field | Input | Notes |
|---|---|---|
| Cycle due date | Date picker | Must be ≤ today; prevents logging future cycles |
| Amount paid | Currency input (cents internally) | Required, > 0 |
| Date paid | Datetime input | Defaults to now; allows retroactive timestamps |

Submits via a new `logHistoricalPayment` server function (distinct from `recordBillPayment` — accepts an explicit `dueDate` rather than deriving it via nearest-unpaid logic). The `UNIQUE(billId, dueDate)` constraint surfaces as a `ConflictError` if the cycle is already recorded; the drawer should display this as an inline field error.

---

## Data Dependencies

| Hook | Purpose |
|---|---|
| `useBillDetail(billId, page)` | Blueprint fields + paginated instances |
| `useUpdateBill()` | Blueprint edit form save |
| `useUpdateBillInstance()` | Edit amount drawer |
| `useDeleteBillInstance()` | Delete confirmation |
| `useLogHistoricalPayment()` | Log historical payment drawer (not yet implemented) |
| `usePaySchedules()` | Schedule selector in edit form |

---

## Backend Gaps

Two functions need to be added before this page can be built:

- **`logHistoricalPayment`** — POST, accepts `{ billId, dueDate, amountActual, paidAt }`. Auth-scopes via bill ownership check. Inserts directly without nearest-unpaid-date derivation. Surfaces `ConflictError` on unique constraint violation. Validate that `dueDate` is not in the future.
- **`updateBillInstance`** — already exists but should be confirmed to only expose `amountActual` (not `paidAt` or `dueDate`).

---

## Future Consideration

Charts/reporting for variable-amount bills (e.g. trend line of `amountActual` over time) — deferred. Likely a tab interface added to this page when prioritized.

---

## Route File

`src/routes/_authenticated/bills/$billId.tsx`
