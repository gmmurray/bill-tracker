# Bill Actions Drawer

**Surface:** global, mounted in the authenticated shell
**Trigger param:** `?actions=true` (root-level search param)
**Auth:** Required

---

## Workflow framing

The drawer is the dashboard's list, reachable from any route.

That is the whole specification. It renders **the same derivation, the same row component, and the same grouping** as [dashboard.md](dashboard.md) — `<OutlookList cycles={outlook.cycles} />` — with no filter of its own.

This is deliberate and worth preserving. The drawer and dashboard previously each ran their own predicate over the raw bill list; the predicates disagreed, and bills fell through the gaps between them. Sharing one derivation means the two surfaces **cannot** disagree about what is owed. Any future "just this one small filter" here re-opens that class of bug.

The only difference from the dashboard is reach: the drawer opens from anywhere, and has no stat cards or schedule tabs.

---

## Trigger points

- **Nav button** (`OutlookNavButton`) — snowflake icon, every authenticated route. Shows a dot when `summarizeAttention` reports anything owed now.
- **Banner** (`OutlookBanner`) — `Review →`.

Both flip `?actions=true` via `navigate({ search: prev => ({ ...prev, actions: true }) })`. Relative navigation keeps the user on their current route.

---

## Layout

`ResponsiveDrawer` — right-side on desktop, full-screen sheet on mobile.

**Header:** `"Bill actions"`, with a subtitle reading `"{n} owed · {amount}"` across the whole horizon, or `"Nothing owed through next month"`. The horizon is stated explicitly here rather than implied by a bare label.

**Body:** `OutlookList` over every cycle. Section collapse behaviour is inherited — `Overdue` and `Pay now` open, `This month` and `Next month` collapsed.

**Empty state:** the logo plus `"You're chilling."` — only reachable when the user has no bills at all, since any bill produces at least one cycle.

**Footer:** `"View all bills →"` to `/bills` for management (filtering, archiving, editing blueprints, history).

---

## Pay action

The shared Pay Cycle Dialog. See [dashboard.md](dashboard.md#pay-cycle-dialog).

The drawer does not close on payment — users batch-process several at once.

---

## Banner

`OutlookBanner` renders above the page content on every authenticated route, and hides entirely when nothing is owed now.

Copy is concrete: `"3 overdue, 7 to pay now · $2127.18"` — counts and a dollar figure, both drawn from the same outlook the drawer renders, so the banner cannot claim a number no surface can account for. Peach when anything is overdue, amber when only due-now.

---

## Data dependencies

None of its own. Everything comes from `useBillOutlook()`.

---

## Future Considerations

Captured centrally in [../future.md](../future.md) under the **Bill Actions Drawer** section.
