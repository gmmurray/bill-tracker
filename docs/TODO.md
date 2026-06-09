# TODO

## Boilerplate Cleanup

- [x] **Page title** — `src/routes/__root.tsx:27` still reads `"TanStack Start Starter"`. Update to `"bill chill"`.

## UI / UX

- [ ] Global navigation progress bar — fake indeterminate bar, 200ms delay before showing, tied to `useRouterState` pending status

## Features to Build

- [x] Server functions + React Query hooks for bill domain (pay schedules, bills, bill instances)
  - **Bills** — list/detail/archived CRUD + query hooks done ([bills-service.ts](src/features/bills/bills-service.ts), [bills-queries.ts](src/features/bills/bills-queries.ts), [bills-model.ts](src/features/bills/bills-model.ts))
  - **Pay schedules** — full CRUD done ([pay-schedules-model.ts](src/features/pay-schedules/pay-schedules-model.ts), [pay-schedules-service.ts](src/features/pay-schedules/pay-schedules-service.ts), [pay-schedules-queries.ts](src/features/pay-schedules/pay-schedules-queries.ts))
  - **Bill instances** — full implementation done ([bills-service.ts](src/features/bills/bills-service.ts), [bills-queries.ts](src/features/bills/bills-queries.ts))
    - [x] `bills-helpers.ts` — `clampDayToMonth`, `computeNearestUnpaidDueDate`, `deriveBillState`
    - [x] `recordBillPayment`, `updateBillInstance`, `deleteBillInstance`, `listCurrentMonthInstances` server functions
    - [x] `useRecordBillPayment`, `useUpdateBillInstance`, `useDeleteBillInstance`, `useCurrentMonthInstances` hooks
  - [x] **State derivation** — `deriveBillState(bill, instances, today)` in `bills-helpers.ts` returning the `PAID | OVERDUE | MISSED_SCHEDULE | UPCOMING` union from CLAUDE.md (frontend-only, O(1) Map lookup keyed on `billId`)
- [ ] Dashboard page (JIT state derivation, 3-row hierarchy)
- [ ] Bills management page (full CRUD, 1–31 chronological view)
