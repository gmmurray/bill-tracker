# Bill Actions Drawer

**Surface:** global, drawer mounted in `__root.tsx`
**Trigger param:** `?actions=true` (root-level search param)
**Auth:** Required (visible only to authenticated users — same as the rest of the authenticated surface)

---

## Workflow framing

The Bill Actions drawer is the app's **action surface** — a single, app-wide vertical list of every bill the user can act on right now, with attention-needing items emphasized at the top and the rest of the month's upcoming bills listed below.

It exists because:

- The dashboard is intentionally narrow ("what's today?"); it shouldn't double as a backlog viewer.
- Users want to act on bills from any page, not just the dashboard.
- Triage and cleanup ("I let things pile up; let me knock these out") is a distinct workflow from daily session work.

The drawer **replaces** the previous concept of a Row 1 critical-alerts bill list on the dashboard. The dashboard banner is now just a notifier that opens this drawer.

---

## Trigger points

- **App nav bar** — icon button on the far right, present on every authenticated route. See "Nav button state" below.
- **Dashboard Row 1 banner** — `Review →` button.
- **Dashboard Row 4 footer** — `See all upcoming →` link.

All three flip `?actions=true` via `navigate({ search: prev => ({ ...prev, actions: true }) })`.

The drawer closes by either:
- The user clicking the close icon / `Cancel` button → sets `actions: false`
- ESC key or backdrop click (existing `ResponsiveDrawer` behavior)

When closed, the search param is removed (set to `false`, which the validator catches as default).

---

## URL plumbing

Add a `validateSearch` to the root route in [src/routes/\_\_root.tsx](src/routes/__root.tsx):

```ts
import { z } from 'zod';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    validateSearch: z.object({
      actions: z.boolean().catch(false),
    }),
    // ...rest
  },
);
```

The schema composes with child route schemas (TanStack Router merges them). Children declare their own params independently and the `actions` param flows through.

The drawer reads its open state from the root search:

```ts
const { actions } = useSearch({ from: '__root__' });
```

Open/close is `navigate({ search: prev => ({ ...prev, actions: true|false }), to: '.' })` — relative nav keeps the user on whatever route they were already on.

---

## Layout

`ResponsiveDrawer` — same primitive used elsewhere. Desktop: right-side drawer. Mobile: full-screen bottom sheet.

**Header:** `"Bill actions"` title. Close icon top-right.

**Body — single vertical scroll, two sections in order:**

### Section 1 — Needs attention

Section header: `"Needs attention"` + count badge (`{N}`), peach/amber accent.

Row content: name, ordinal day, amount, state tag (`Overdue` peach badge / `Missed schedule` amber badge), `Pay` button.

Sort: **days past due descending** (worst offender at the top). Bills in `OVERDUE` state count days as `today - clampedDueDay`. Bills in `MISSED_SCHEDULE`-from-non-active state count days as `today - clampedAnchorDay`. Ties broken by `dueDayOfMonth` ascending.

Bills included:
- `OVERDUE` (any schedule assignment, including orphaned and unassigned)
- `MISSED_SCHEDULE` where the bill's schedule is **not** the active schedule (per dashboard active-schedule rule)

Bills excluded: anything `UPCOMING` or `PAID`, anything on the active schedule (those live in the dashboard Row 3 session).

Section hides entirely when there are no attention items.

### Section 2 — Upcoming this month

Section header: `"Upcoming this month"`. No badge.

Row content: name, ordinal day, amount, `Pay` button. No state tag (everything here is `UPCOMING` — the tag would be redundant).

Sort: `dueDayOfMonth` ascending.

Bills included: every `UPCOMING` bill with `dueDayOfMonth` falling on or after today, within the current calendar month. Includes all schedule assignments, unassigned, orphaned.

Section hides entirely when there are no upcoming items this month.

### Empty state

If both sections are empty: centered `"You're all caught up."` text. Illustration is on the TODO list — for v1 spec'd as text-only.

### Footer link — View all bills

Below both sections (or beneath the empty state), a quiet footer link: `"View all bills →"` navigating to `/bills` (the bill management page).

Rationale: the drawer is **action-focused** — it surfaces what to pay and lets the user pay it. The full management view (filtering, archiving, editing blueprints, viewing history) lives on `/bills`, and the user should be one click away when they want it. Implemented as `<Link to="/bills" search={{ scheduleId: 'all', manualOnly: false }}>` so the existing search-param defaults are respected.

Navigation closes the drawer (set `actions: false` in the same `navigate` call, or rely on the drawer's open state being tied to the search param — since the user is moving to a new route with `actions: false` defaulting, it closes automatically).

---

## Pay action

Reuses the same Pay confirmation dialog spec'd in [dashboard.md](dashboard.md):

- Read-only `"Applying to: {formatted nearestUnpaidDueDate}"`
- Editable amount input prefilled with `amountExpected / 100`
- `Cancel` / `Confirm payment` footer
- Inline conflict error if the UNIQUE constraint fires
- Calls `useRecordBillPayment().mutateAsync({ billId, amountActual })`

After a successful payment, the bill's state is recomputed:
- If the new `nearestUnpaidDueDate` falls outside the bill's current section, it disappears from the drawer
- Otherwise it stays in place with the new target

The drawer does not close on payment — users typically batch-process several at once.

---

## Nav button state

Two visual states. Implemented as a single button in the nav bar with conditional styling based on `attentionCount > 0`.

| State | When | Appearance |
|---|---|---|
| **Active** | At least one bill in the Needs Attention section | Filled icon, `chill-peach` background or `chill-peach-border` ring |
| **Inactive** | No bills need attention | Outlined icon, `chill-text-muted` |

Icon: TBD during build — something list/check-shaped. The label is `"Actions"` (accessible name, visible on wider viewports). Click → opens drawer.

Both states are functional — clicking when inactive still opens the drawer (the user might want to review upcoming bills even when nothing is overdue).

Smarter "you have things to do" indicators (count badge, urgency tint, etc.) are deferred. See "Future considerations."

---

## Data dependencies

Drawer reads:

| Hook | Purpose |
|---|---|
| `useBills({ scheduleId: 'all', manualOnly: false })` | All active bills |
| `usePaySchedules()` | Schedule lookup for active-schedule detection |
| `useCurrentMonthInstances()` | State derivation |
| `useRecordBillPayment()` | Pay confirmation dialog |

All four are already loader-pre-warmed on the dashboard. When the drawer opens from a non-dashboard route, they fetch on demand. Queries are deduplicated app-wide, so no extra cost.

The nav button needs `attentionCount` to drive its active/inactive state. Since the same data hooks are needed, the nav button computes `attentionCount` from the same in-memory derivation. The button mounts inside the authenticated layout, so the queries are guaranteed to be available there (and we can pre-warm via the authenticated layout's loader if performance demands it).

---

## In-memory derivation

```
const billStates = bills.map(bill => ({
  bill,
  state: deriveBillState(bill, schedule, instancesByBillId.get(bill.id) ?? [], today),
}));

const attention = billStates.filter(({ bill, state }) =>
  state === 'OVERDUE' ||
  (state === 'MISSED_SCHEDULE' && bill.payScheduleId !== activeSchedule?.id),
);

const upcoming = billStates.filter(({ bill, state }) =>
  state === 'UPCOMING' &&
  bill.dueDayOfMonth >= today.getDate(),
);
```

`activeSchedule` is the same selection used by the dashboard (earliest unfinished session). When opened from a non-dashboard route, the drawer re-runs that selection — it's cheap.

---

## Today / midnight refresh

The drawer's state derivation depends on `today`. If the drawer is open across midnight (unlikely but possible), states would go stale.

For v1, the drawer reads a `today` value computed at drawer mount. Closing and reopening picks up the new value. The dashboard's midnight bump (see [dashboard.md](dashboard.md)) covers the dashboard's needs; reproducing the bump in the drawer is overengineering for v1.

If the nav button uses the drawer's `attentionCount`, that count also goes stale at midnight on long-lived sessions. Acceptable trade-off — the button is informational, not transactional.

---

## File layout

- `src/components/bill-actions-drawer.tsx` — the drawer component itself
- `src/components/bill-actions-nav-button.tsx` — the nav bar trigger (or inline in the existing nav component if it's small)
- Updates to `src/routes/__root.tsx` — `validateSearch`, mount the drawer next to `<RouterProgress />` and `<Toaster />`
- Updates to the authenticated layout — add the nav button on the far right

---

## Future Considerations

Captured centrally in [../future.md](../future.md) under the **Bill Actions Drawer** section.
