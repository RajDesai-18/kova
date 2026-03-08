# Kova — Architecture

## Monorepo Layout
```
kova/
├── apps/
│   ├── web/          # Next.js 16 (App Router)
│   └── server/       # Express 5 API
├── packages/
│   └── shared/       # Zod schemas, shared types
├── turbo.json
└── package.json
```

## Frontend Architecture
- **Routing:** Next.js App Router with route groups
  - `(auth)` — login, register (centered layout)
  - `(main)` — authenticated pages (sidebar layout)
- **State:** Zustand for UI state, React Query for server state
- **Styling:** Tailwind CSS v4 with CSS-first configuration
- **Editor:** Tiptap 2.x with extensions

## Backend Architecture
- **Framework:** Express 5 with TypeScript
- **ORM:** Prisma 6 with PostgreSQL
- **Auth:** bcrypt + JWT in httpOnly cookies
- **Validation:** Zod schemas from shared package
- **Error Handling:** Consistent `{ error: { code, message } }` format

## Infrastructure
- PostgreSQL 16 via Docker
- Redis 7 via Docker (for future real-time features)
- Turborepo for build orchestration
