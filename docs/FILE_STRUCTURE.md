(for future refactor)

src/
├── components/
│ ├── ui/ # Primitives (button, input)
│ └── shared/ # Multi-feature smart wrappers
│
├── db/ # Drizzle ORM Single Source of Truth
│ ├── client.ts
│ └── schema.ts
│
├── features/ # Pure Domain-Driven Architecture
│ └── bills/
│ ├── components/ # Local views & leaf elements
│ ├── bills-helpers.ts
│ ├── bills-helpers.test.ts # 🎉 Colocated unit tests!
│ └── bills-queries.ts
│
├── lib/ # Global infra & client setups
│ ├── errors.ts
│ ├── query-client.ts
│ └── utils.ts
│
└── routes/ # Ultra-lean routing entry points
└── \_authenticated.schedules.tsx
