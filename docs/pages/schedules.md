# Pay Schedules Page

**Route:** `/schedules`
**Auth:** Required (`/_authenticated`)

---

## Workflow framing

This is not a CRUD page first — it is the **assignment workflow** for the app. The user's primary question on this page is: *"What bills do I pay on the 1st? On the 15th? What's still unassigned?"* CRUD (rename, change anchor day, archive) is a secondary action accessed through per-card menus.

---

## Layout

### Header

Page title "Pay Schedules" on the left. `+ New Schedule` button on the right — opens the create drawer.

### Schedule Cards

One `Card` per active schedule, ordered by `anchorDay` ascending.

**Card header:**

- Schedule name and anchor day (e.g. "1st of Month (anchor day 1)")
- **Aggregate total** of `amountExpected` across assigned bills, rendered inline on the right (e.g. "$1,355.00")
- Schedule-level `⋯` menu (icon button → `DropdownMenu`):
  - "Edit" — opens edit drawer
  - "Archive" — opens AlertDialog confirmation, calls `useArchivePaySchedule`

**Card body — assigned bill list:**

Bills assigned to this schedule, ordered by `dueDayOfMonth` ascending. Each row shows:

| Column | Content |
|---|---|
| Name | `bill.name` |
| Day | `bill.dueDayOfMonth` (ordinal — reuse `formatOrdinal` if it ends up shared, otherwise duplicate) |
| Amount | `formatCurrency(bill.amountExpected)` |
| ⋯ | Per-bill menu |

**Per-bill `⋯` menu:**

- "Open bill" — navigates to `/bills/$billId`
- "Move to →" submenu — lists all other active schedules + "Unassigned". Selecting one calls `useUpdateBill({ id, payScheduleId })` with the new value (or `null` for Unassigned).

**Card footer:**

Render the aggregate total again as a footer summary line ("Total: $1,355.00"). This is intentionally redundant with the header — we want to compare placement and decide later which feels better. Both stay until the user picks one.

**Card action row (bottom of body, above footer):**

`[ + Assign Bills ]` button — opens the bulk-assign sheet (see below).

### Unassigned Pool Card

A separate `Card` rendered after all active schedule cards. Header reads "Unassigned (N)" where N is the count of bills with `payScheduleId === null`.

Same bill row shape as schedule cards. Same per-bill `⋯` menu (the "Move to" submenu will not include "Unassigned" since the bill is already unassigned).

No `[ + Assign Bills ]` button (no schedule to assign to). No archive option. No aggregate footer.

If the count is 0, hide the entire card.

### Archive Escape Hatch

Below the cards, a plain text link: `View Archived Schedules (N) →` linking to `/schedules/archived`. Count sourced from `useArchivedPaySchedulesCount()` (backend gap — see below). Hide entirely when count is 0.

---

## Create Schedule Drawer

Triggered by `+ New Schedule`. Responsive drawer.

**Fields:**

| Field | Input | Validation |
|---|---|---|
| Name | Text | Required, 1–100 chars |
| Anchor day | Number input | Required, 1–31 |

On success: close drawer, toast feedback comes from `useCreatePaySchedule` hook. New schedule appears in the list (sorted by anchor day).

---

## Edit Schedule Drawer

Triggered by the schedule card `⋯` menu "Edit" item. Same shape as the create drawer with the existing values prefilled.

On success: close drawer, list updates via cache invalidation.

---

## Bulk Assign Bills Drawer

Triggered by the `[ + Assign Bills ]` button on a schedule card. Responsive drawer.

**Header:** "Assign bills to {schedule.name}"

**Body:**

- Toggle at the top: "Show all bills" — default off. When off, list is filtered to unassigned bills only (`payScheduleId === null`). When on, list includes bills already assigned to other schedules (each row shows the current schedule name as muted helper text so the user knows they'd be re-assigning).
- Scrollable list of bills with a checkbox + name + day + amount + (optional current schedule label).
- Sort by `dueDayOfMonth` ascending.

**Empty state:** "No bills available to assign." (Could be either: no bills exist at all, or no unassigned bills when toggle is off.)

**Footer:** `Cancel` + `Assign N bill(s)` (disabled when 0 selected).

On submit: loop `useUpdateBill().mutateAsync({ id, payScheduleId: schedule.id })` for each selected bill. For a personal app with small N this is acceptable; a bulk endpoint is a deferred optimization. Show a single success toast at the end (`N bills assigned to {schedule.name}`) — suppress per-mutation toasts by using `mutateAsync` and a final manual toast. **Backend gap:** if this gets noisy, add `bulkAssignBills` later.

---

## Data Dependencies

| Hook | Purpose |
|---|---|
| `usePaySchedules()` | Active schedule list (already exists) |
| `useBills({ scheduleId: 'all', manualOnly: false })` | All bills, grouped in memory by `payScheduleId` |
| `useArchivedPaySchedulesCount()` | Archive escape hatch count (backend gap) |
| `useCreatePaySchedule()` | Create drawer |
| `useUpdatePaySchedule()` | Edit drawer |
| `useArchivePaySchedule()` | Archive confirmation |
| `useUpdateBill()` | "Move to" menu + bulk assign |

Group bills in memory: build a `Map<string | 'unassigned', Bill[]>` keyed on `payScheduleId ?? 'unassigned'`. Aggregate totals are a one-line reduce per schedule.

---

## Schedules Archive Page

**Route:** `/schedules/archived`

Mirror of `/bills/archived`. Simple flat list of archived (`isActive = false`) schedules ordered by name.

**Columns:** Name | Anchor Day | Archived (date) | Actions

**Restore** — calls `useRestorePaySchedule` (backend gap), invalidates archive + active lists, toast feedback.

**Delete** — `AlertDialog` confirmation. Copy must explicitly warn about the cascading effect on bills:

> "Permanently delete {schedule.name}? This will unassign any bills currently assigned to it. This cannot be undone."

On confirm, calls `useDeletePaySchedule` (backend gap). The service function must either rely on `ON DELETE SET NULL` at the FK level (preferred — verify schema) or null out `bills.payScheduleId` in a transaction before deleting the schedule.

---

## Backend Gaps

Several pieces need to be added before this page can be built:

1. **`dropdown-menu` UI primitive** — required for the per-card and per-bill `⋯` menus. Wrap Radix `DropdownMenu`, follow the conventions in existing primitives. Needs trigger, content, item, sub-trigger/sub-content for the "Move to" nested menu.

2. **`getArchivedPaySchedules` server function** — GET, returns all `paySchedules` rows where `userId = userId AND isActive = false`, ordered by `name`.

3. **`getArchivedPaySchedulesCount` server function** — GET, returns `{ count: number }` for the escape hatch.

4. **`restorePaySchedule` server function** — POST, accepts `{ scheduleId }`, sets `isActive = true`. Mirror of `restoreBill`.

5. **`deletePaySchedule` server function** — POST, accepts `{ scheduleId }`, hard deletes. **Critical:** verify the `bills.payScheduleId` FK behavior in `src/db/schema.ts`. If it is not `ON DELETE SET NULL`, either change the schema (preferred) or null out the field in a transaction before delete.

6. **`useRestorePaySchedule` + `useDeletePaySchedule` + `useArchivedPaySchedules` + `useArchivedPaySchedulesCount` hooks** — match the bills patterns including toast feedback and optimistic removal where appropriate.

---

## Route Files

- `src/routes/_authenticated/schedules.tsx` — existing placeholder, **delete**
- `src/routes/_authenticated/schedules/index.tsx` — main schedules page (this spec)
- `src/routes/_authenticated/schedules/archived.tsx` — archive page

Restructure mirrors the bills routes.

---

## Future Considerations

- **Drag-and-drop assignment** — deferred. The `⋯` menus + bulk assign sheet cover the workflow. Revisit only if usage proves the menus are too clunky.
- **Bulk operations endpoint** — `bulkAssignBills` server function to replace the loop in the bulk assign flow. Defer until performance warrants it.
- **Aggregate placement decision** — header vs footer vs both. Pick one after using the page for a few weeks.
