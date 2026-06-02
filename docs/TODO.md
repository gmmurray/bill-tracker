# TODO

## Boilerplate Cleanup

- [ ] **Page title** — `src/routes/__root.tsx:27` still reads `"TanStack Start Starter"`. Update to `"bill chill"`.
- [ ] **Home route** — `src/routes/index.tsx` is the TanStack Start template. Replace with redirect logic: authenticated → `/dashboard`, unauthenticated → `/sign-in/$`. Also remove the unused `Show` and `UserButton` imports.
- [ ] **Auth layout styling** — `src/components/auth-layout.tsx` mixes Tailwind utility classes with raw `style` props. Standardize to Tailwind throughout.

## Features to Build

- [ ] Server functions + React Query hooks for bill domain (pay schedules, bills, bill instances)
- [ ] Dashboard page (JIT state derivation, 3-row hierarchy)
- [ ] Bills management page (full CRUD, 1–31 chronological view)
