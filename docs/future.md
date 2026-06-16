# Future Considerations

A central capture of ideas that have been raised, discussed, and explicitly deferred during planning. **Not a backlog** — items here are not committed to. If something here graduates into committed work, move it into [TODO.md](TODO.md) with enough detail to act on.

Organized by the surface or system the idea relates to. Each entry should explain *what* and *why-deferred* (not how — that comes when it's promoted).

---

## Dashboard

- **Drag-and-drop to mark paid.** Direct manipulation of bills into a "paid" zone. Deferred: checkbox click is direct enough and the dashboard already has limited vertical space.
- **Aggregate "amount due today" widget.** A third snapshot showing the total dollar amount due today specifically. Deferred: the existing two snapshots may be sufficient; revisit after using the page for a few weeks.
- **Multi-month view / forecast.** Toggle to project upcoming bills across the next 2–3 months. Deferred: the JIT paradigm explicitly doesn't model the future, and adding a forecast view contradicts the core philosophy. Would require rethinking the data model.

---

## Bill Actions Drawer

- **Smarter nav button state.** Count badge, "newly overdue" glow, urgency tints, etc. Deferred: starting with a simple active/inactive treatment to see how it feels in practice before layering on signaling.
- **Multi-select + bulk pay.** Check multiple bills, hit `Pay all`, get a confirmation summary. Useful for end-of-month cleanup but adds dialog complexity. Deferred until pay sessions feel slow.
- **Filters within the drawer.** Filter to a specific schedule, hide auto-pay bills, etc. Deferred: for a personal-scale app the drawer list shouldn't get long enough to need this.
- **Forecast view.** Toggle to show upcoming bills in the *next* month too. Deferred until the strict current-month scope produces friction.
- **Persistence of scroll position** across open/close cycles. Deferred: probably unnecessary given the list length.

---

## Schedules Page

- **Drag-and-drop bill assignment.** Drag bills between schedule cards instead of using the `⋯` → `Move to` submenu or the bulk-assign drawer. Deferred: the menus + bulk assign cover the workflow; revisit only if menu usage proves clunky.
- **Aggregate placement decision.** Schedule cards currently show the aggregate total in both the header *and* the footer for comparison. Pick one after using the page for a few weeks.

---

## Bill Detail Page

- **Historical trend chart for variable-amount bills.** Utilities and similar bills fluctuate; a small line chart over the last 12 months of `amountActual` would be valuable. Deferred until enough payment history accumulates to make it meaningful.
