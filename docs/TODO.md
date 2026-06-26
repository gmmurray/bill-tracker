# TODO

Active work, grouped by theme. Shipped items live in git history — strip a checkbox once it merges.

## UI / UX polish

- [ ] **Bill Actions drawer — empty-state illustration** — when both sections are empty the drawer reads `"You're all caught up."` Design something simple to reinforce the moment.
- [ ] **Bill Actions nav button — active/inactive treatment** — icon is `FiCheckCircle` (settled). Remaining ask is the visual treatment: spec'd as "outlined → filled with peach background", currently just swaps `text-chill-text-muted` ↔ `bg-chill-peach`. Needs a design pass.

## Copy / labels

- [ ] **Helper text pass across the app** — sweep for places where concepts (schedules, due day, JIT payment state, auto-pay semantics, etc.) would benefit from a one-line nudge or tooltip. Anywhere users might pause.

## Create bill flow

- [ ] **Expand quick-add fields** — surface more bill fields in the quick-add UI rather than punting most of them to detail.

## Backend / Infra

- [ ] **Clerk `user.deleted` webhook** — when a Clerk account is deleted, cascade-delete all rows scoped to that `userId` in `bills`, `pay_schedules`, `bill_instances`. Otherwise data is orphaned and the user has no path to remove it (GDPR-adjacent concern). Webhook endpoint should verify the Svix signature using `CLERK_WEBHOOK_SECRET`, then run a single transaction (or sequential deletes — `bill_instances` has FK to bills with `ON DELETE CASCADE`, so deleting bills + pay_schedules should suffice; verify schema).

## Deferred — awaiting repro

- [ ] **Stale state after login** — dashboard occasionally renders "no active schedule" on first load post-sign-in; refresh fixes it. Original staleTime-cache hypothesis is now weaker — `AuthCacheWatcher` in `__root.tsx` clears the query cache on `userId` transition (null → signed-in), so empty data shouldn't persist across a sign-in. If this still repros, investigate what happens _during_ that transition (race between cache clear, query refetch, and component render).
- [ ] **Brief flash on first dashboard load** — empty/loading state visible briefly before data arrives. Probably client-side navigation post-sign-in skipping SSR.
