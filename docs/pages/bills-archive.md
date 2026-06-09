# Bills Archive Page

**Route:** `/bills/archived`  
**Auth:** Required (`/_authenticated`)

---

## Layout

### Back Navigation

`← Back to Bills` link returning to `/bills`.

### Header

"Archived Bills (N)" — count sourced from `useArchivedBillsCount()`.

### Archive Table

Simple flat list of all archived bills (`isActive = false`), ordered by name ascending. No filters, no pagination.

**Columns:**

| Column | Content |
|---|---|
| Bill Name | `name` |
| Due Day | `dueDayOfMonth` formatted as ordinal (e.g. "18th") |
| Archived | `updatedAt` timestamp of when the bill was archived |
| Actions | Restore button + Delete button |

**Restore button** — calls `updateBill({ id, isActive: true })`, invalidates bill lists and archived count, navigates to `/bills` on success.

**Delete button** — triggers a confirmation dialog: "Permanently delete [bill name] and all its payment history? This cannot be undone." On confirm, calls a `deleteBill` server function (hard delete). Cascades to all associated `bill_instances`.

---

## Data Dependencies

| Hook | Purpose |
|---|---|
| `useArchivedBills()` | Table rows |
| `useArchivedBillsCount()` | Header count |
| `useUpdateBill()` | Restore action |
| `useDeleteBill()` | Permanent delete (not yet implemented) |

---

## Backend Gap

- **`deleteBill`** — POST, accepts `{ billId: string }`. Auth-scopes by `userId`. Hard deletes the `bills` row; `bill_instances` should cascade via FK constraint (verify in schema). Needs a corresponding `useDeleteBill` mutation hook that invalidates `billKeys.archived()` and `billKeys.archivedCount()`.

---

## Route File

`src/routes/_authenticated/bills/archived.tsx`
