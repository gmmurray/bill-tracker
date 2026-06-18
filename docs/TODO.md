# TODO

## Boilerplate Cleanup

- [x] **Page title** — `src/routes/__root.tsx:27` still reads `"TanStack Start Starter"`. Update to `"bill chill"`.

## UI / UX

- [x] **Router-driven loading refactor** — bundle the global progress bar with a sweep to move per-route data fetching into TanStack Router loaders (`queryClient.ensureQueryData`). Single source of truth for "navigating": fake indeterminate bar, 200ms delay before showing, tied to `useRouterState({ select: s => s.status })`. With loaders pre-warming the cache, every `if (isLoading) return "Loading..."` block on a loader-backed route becomes dead code and should be removed in the same pass. Empty states and mutation `isPending` blocks stay as-is — `isLoading` is `isPending && !hasData` so it only fires on truly uncached queries, which loaders eliminate.
- [x] **Mobile table pass** — bills/index, bills/archived, schedules/archived tables get cut off below `md`. Switch to stacked card rows at `<md` (table at `md+`).

## Backend / Infra

- [ ] **Clerk `user.deleted` webhook** — when a Clerk account is deleted, cascade-delete all rows scoped to that `userId` in `bills`, `pay_schedules`, `bill_instances`. Otherwise data is orphaned and the user has no path to remove it (GDPR-adjacent concern). Webhook endpoint should verify the Svix signature using `CLERK_WEBHOOK_SECRET`, then run a single transaction (or sequential deletes — bill_instances has FK to bills with `ON DELETE CASCADE`, so deleting bills + pay_schedules should suffice; verify schema).

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
- [x] **Bill detail page** — [bills/$billId.tsx](src/routes/_authenticated/bills/$billId.tsx)
- [x] **Bills archive page** — [bills/archived.tsx](src/routes/_authenticated/bills/archived.tsx)
- [x] Dashboard page (JIT state derivation, 3-row hierarchy)
- [ ] Dashboard — small celebratory donut animation on payment (snapshot widgets in Row 2 animate the fill increment when a `bill_instance` is recorded)
- [ ] Bill Actions drawer — empty state illustration (drawer reads `"You're all caught up."` when both sections are empty; design something simple to reinforce the moment)
- [ ] Bill Actions nav button — pick the icon and define the active/inactive treatment (currently spec'd as "outlined → filled with peach background" but the icon itself is TBD; needs a design pass before build)
- [ ] create bill - "add another" check box
- [ ] create bill - consider including more fields in the "quick add" ui
- [ ] "anchor" day/date rename in ui since it might feel unclear for users.
- [ ] related to above: could probably include some helper text across the app
- [ ] replace one-off svgs with react-icons (feather)
- [ ] dashboard updates
  - [ ] log in existing user with an active schedule - dashboard loads with no active schedule. refresh page, loads as expected.
  - [ ] auto indicator as checkmark is unclear - need different icon
  - [ ] should probably leave upcoming bills that are paid (row 4) as checked off when paid. otherwise they kind of disappear completely. it feels important to know what has been taken care of at a glance vs paid stuff disappearing completely
  - [ ] active schedule - probably dont need to show check box AND pay button. honestly im possibly open to discarding the checkbox entirely since we arent allowing user to uncheck anyway.
  - [ ] somewhat unclear the states in active schedule section at a glance. bills that need attention have colored background. paid bills have no background and disabled state. some bills have yellowish background, and some of those have a left border. also, sometimes you have unpaid / overdue bills, then a paid bill, then more unpaid bills. i think we should probably group the paid bils in the active schedule by paid at the top, then date within those, then unpaid by date. i could see arguents for having paid at top or bottom - top means youre working down a list, bottom means the focus is on the first item in the list which would always be something that needs to be paid
- [ ] reevaluate the error/warning color. right now i thhink the color is a little too comforting to stand out as an error color. but we also want whatever error color we choose to still fit the palette.
- [ ] global not found / 404 page
