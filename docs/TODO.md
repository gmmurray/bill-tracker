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
- [x] **Responsive drawer/sheet component** — [responsive-drawer.tsx](src/components/ui/responsive-drawer.tsx)
- [x] **Backend gaps** — `logHistoricalPayment` + `deleteBill` server functions and hooks ([bills-service.ts](src/features/bills/bills-service.ts), [bills-queries.ts](src/features/bills/bills-queries.ts))
- [x] **Bill management page** — [bills/index.tsx](src/routes/_authenticated/bills/index.tsx)
- [ ] **Bill detail page** — see [docs/pages/bill-detail.md](docs/pages/bill-detail.md)
- [ ] **Bills archive page** — see [docs/pages/bills-archive.md](docs/pages/bills-archive.md)
- [ ] Dashboard page (JIT state derivation, 3-row hierarchy)
