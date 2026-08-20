# TODO

Active work, grouped by theme. Shipped items live in git history — strip a checkbox once it merges.

## Payment History

Spec: [pages/history.md](pages/history.md).

- [ ] `Checkbox` UI primitive (Radix wrapper, needs indeterminate state) — CLAUDE.md claims one exists; it doesn't
- [ ] `listPaymentHistory` server fn + `PaymentHistoryRow` model. **Must not filter on `bills.isActive`** — archiving a bill can't erase its history
- [ ] `billKeys.history` + invalidation from all five instance mutations (record, log historical, update, delete instance, delete bill)
- [ ] `/history` route: month dividers, responsive table/cards, paginated 25/page
- [ ] Cross-page selection storing whole rows, sticky sum bar, `Show only` toggle
- [ ] `'/history'` added to the `NavLink` `to` union + sidebar entry
