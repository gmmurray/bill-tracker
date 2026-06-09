# Bill Management Page

**Route:** `/bills`  
**Auth:** Required (`/_authenticated`)

---

## Layout

### Header

Page title "Bill Management" on the left. `+ Add New Bill` button on the right — opens the quick-add drawer.

### Filter Bar

Sits directly above the table. Two controls, state persisted as URL search params:

- **Schedule dropdown** — options: "All Schedules" (default), "Unassigned", then one entry per active pay schedule ordered by `anchorDay`. Param key: `scheduleId` (values: `all` | `unassigned` | `<uuid>`).
- **Manual Pay Only toggle** — filters to bills where `isAutoPay = false`. Param key: `manualOnly` (values: `true` | omitted).

### Bill Table

Chronological list of all active bill blueprints sorted by `dueDayOfMonth` ascending (1–31). Columns:

| Column | Content |
|---|---|
| Day | `dueDayOfMonth` |
| Bill | Bill name |
| Schedule | Assigned schedule name, or "Unassigned" if none |
| Expected | `amountExpected` formatted as currency |
| Auto | Visual indicator (icon/badge) when `isAutoPay = true` |
| Actions | Archive button |

**Row click** — entire row is clickable, navigates to `/bills/$billId`.

**Orphaned rows** — bills where `isOrphaned = true` (assigned to a deactivated schedule) render an inline warning next to the schedule name. Row click still navigates to detail normally.

**Archive button** — triggers a confirmation dialog ("Archive [bill name]? This cannot be undone from this view."). On confirm, calls `archiveBill` and optimistically removes the row.

### Archive Escape Hatch

Below the table: `View Archived Bills (N) →` as a plain text link to `/bills/archived`. Count sourced from `useArchivedBillsCount()`.

---

## Quick-Add Drawer

Triggered by `+ Add New Bill`. Responsive: side drawer on desktop, full-screen sheet on mobile.

**Fields:**

| Field | Input | Validation |
|---|---|---|
| Name | Text | Required, 1–100 chars |
| Expected amount | Currency input (cents internally) | Required, > 0 |
| Due day of month | Number input | Required, 1–31 |

**On success:** close drawer, navigate to `/bills/$billId` for the newly created bill with edit mode active by default (detail page handles remaining fields: schedule, payment URL, auto-pay, notes).

---

## Data Dependencies

| Hook | Purpose |
|---|---|
| `useBills(filters)` | Table rows, driven by URL params |
| `usePaySchedules()` | Schedule dropdown options |
| `useArchivedBillsCount()` | Count in archive link |
| `useCreateBill()` | Quick-add drawer submission |
| `useArchiveBill()` | Archive confirmation action |

---

## Route File

`src/routes/_authenticated/bills/index.tsx`

URL param schema should be defined with TanStack Router's `validateSearch` using zod — `scheduleId: z.string().default('all')`, `manualOnly: z.boolean().default(false)`.
