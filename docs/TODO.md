# TODO

## Boilerplate Cleanup

- [ ] **Page title** — `src/routes/__root.tsx:27` still reads `"TanStack Start Starter"`. Update to `"bill chill"`.
- [ ] **Home route** — `src/routes/index.tsx` is the TanStack Start template. Replace with redirect logic: authenticated → `/dashboard`, unauthenticated → `/sign-in/$`. Also remove the unused `Show` and `UserButton` imports.
- [ ] **Auth layout styling** — `src/components/auth-layout.tsx` mixes Tailwind utility classes with raw `style` props. Standardize to Tailwind throughout.

## UI / UX

- [ ] Global navigation progress bar — fake indeterminate bar, 200ms delay before showing, tied to `useRouterState` pending status

## Features to Build

- [ ] Server functions + React Query hooks for bill domain (pay schedules, bills, bill instances)
  - **Bills** — list/detail/archived CRUD + query hooks done ([bills-service.ts](src/features/bills/bills-service.ts), [bills-queries.ts](src/features/bills/bills-queries.ts), [bills-model.ts](src/features/bills/bills-model.ts))
  - **Pay schedules** — full CRUD done ([pay-schedules-model.ts](src/features/pay-schedules/pay-schedules-model.ts), [pay-schedules-service.ts](src/features/pay-schedules/pay-schedules-service.ts), [pay-schedules-queries.ts](src/features/pay-schedules/pay-schedules-queries.ts))
    - [ ] `getPayScheduleDetail` (or equivalent) if the schedules page needs single-record reads
  - [ ] **Bill instances** — nothing exists yet; instance reads are only bundled into `getBillDetail`. Still need (all under `features/bills/`):
    - [x] `bills-helpers.ts` with pure date math: `clampDayToMonth(day, year, month)` wrapping `Math.min(daysInMonth, day)`, and `computeNearestUnpaidDueDate(bill, existingInstances, today)` implementing the unbounded look-ahead from CLAUDE.md
    - [ ] `recordBillPayment` server function — accepts `{ billId, amountActual }`, derives `dueDate` via the helper above, inserts a `bill_instances` row, and surfaces the unique-constraint violation as a typed error
    - [ ] `deleteBillInstance` / `updateBillInstance` server functions for correcting mis-recorded payments
    - [ ] `listCurrentMonthInstances` server function — the lean current-relevant-month dataset the dashboard joins in memory (per CLAUDE.md "two lean datasets")
    - [ ] Query hooks (`useRecordBillPayment`, `useCurrentMonthInstances`, etc.) with optimistic updates and invalidation of `billKeys.lists()` + `billKeys.detail()`
  - [x] **State derivation** — `deriveBillState(bill, instances, today)` in `bills-helpers.ts` returning the `PAID | OVERDUE | MISSED_SCHEDULE | UPCOMING` union from CLAUDE.md (frontend-only, O(1) Map lookup keyed on `billId`)
- [ ] Dashboard page (JIT state derivation, 3-row hierarchy)
- [ ] Bills management page (full CRUD, 1–31 chronological view)
