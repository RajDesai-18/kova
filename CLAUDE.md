# Kova

Collaborative AI-assisted workspace (Notion-like). Portfolio project.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui (base-nova), Tiptap 2.x, Zustand 5, TanStack React Query 5
- **Backend:** Express 5, Prisma 6, PostgreSQL 16, Redis 7
- **Monorepo:** npm workspaces + Turborepo
- **Auth:** JWT in httpOnly cookies, bcrypt

## Project Structure

- `apps/web/` — Next.js frontend
- `apps/server/` — Express API
- `packages/shared/` — shared types & Zod schemas

## Commands

- `npm run dev` — start all services
- `npm run build` — build all packages
- `npm run db:push` — push Prisma schema to DB
- `npm run db:generate` — generate Prisma client

## Conventions

- Strict TypeScript everywhere
- Zod for runtime validation on API boundaries
- Error format: `{ error: { code, message } }`
- Tailwind v4 CSS-first config (no tailwind.config.js)
- App Router with route groups: `(auth)` and `(main)`
- UI components from shadcn/ui in `components/ui/`, barrel-exported from `components/ui/index.ts`

## Current Phase

**Phase 1: Foundation** — Complete. Handed off. See [`docs/phase1-handoff.md`](docs/phase1-handoff.md).

**Phase 2: Real-Time Collaboration** — Complete. Handed off. See [`docs/phase2-handoff.md`](docs/phase2-handoff.md).

### Phase 2 Checklist

- [x] Step 1: Prisma schema — `ydoc` column + `WorkspaceMember` model
- [x] Step 2: Hocuspocus WebSocket server (auth, database persistence, Redis)
- [x] Step 3: Frontend Yjs + Tiptap collaboration integration
- [x] Step 4: Live cursor CSS styles
- [x] Step 5: Presence system (editor bar + sidebar dots)
- [x] Step 6: Connection status indicator
- [x] Step 7: Multi-user seed + workspace membership access checks
- [x] Step 8: End-to-end verification
- [x] Step 9: Playwright screenshots

### Phase 1 Checklist (done)

- [x] Step 1: Project Memory & Docs
- [x] Step 2: Monorepo Scaffold
- [x] Step 3: Docker Compose
- [x] Step 4: Backend — Prisma + Database
- [x] Step 5: Backend — Auth System
- [x] Step 6: Backend — Document CRUD
- [x] Step 7: Frontend — UI Primitives
- [x] Step 8: Frontend — Layout Shell & Sidebar
- [x] Step 9: Frontend — Auth Pages
- [x] Step 10: Frontend — Tiptap Editor
- [x] Step 11: Connect Frontend to Backend
- [x] Step 12: Seed Script
- [x] Step 13: Verify Full Flow
- [x] Upgrade: Next.js 15 → 16
- [x] Upgrade: Editor — Slash commands, inline toolbar, emoji picker, toggle/callout blocks
- [x] Upgrade: UI primitives → shadcn/ui
- [x] Phase 1 handoff summary

## Verification

- `npm run build` — all packages compile cleanly (Next.js 16.1.6 + Turbopack, 5 routes)
- `docker compose up -d` — Postgres + Redis running
- `npm run db:push` — schema applied
- `npm run db:seed` — demo users seeded (demo@kova.app + demo2@kova.app / password123)
- Playwright E2E: 52/52 tests pass (full-flow 2, editor-features 34, collaboration 3, new-features 13)
- Screenshots captured in `e2e/screenshots/`

## Project Docs

- [`docs/spec.md`](docs/spec.md) — product specification
- [`docs/architecture.md`](docs/architecture.md) — system architecture
- [`docs/phase1-plan.md`](docs/phase1-plan.md) — Phase 1 execution plan
- [`docs/phase1-handoff.md`](docs/phase1-handoff.md) — Phase 1 handoff summary (features, API, schema, Phase 2 notes)
- [`docs/plans/2026-03-07-editor-upgrade-design.md`](docs/plans/2026-03-07-editor-upgrade-design.md) — Editor upgrade design
- [`docs/phase2-plan.md`](docs/phase2-plan.md) — Phase 2 plan & status (real-time collaboration)
- [`docs/phase2-handoff.md`](docs/phase2-handoff.md) — Phase 2 handoff summary (collaboration, WebSocket, presence, Phase 3 notes)
- [`docs/plans/2026-03-07-editor-upgrade-plan.md`](docs/plans/2026-03-07-editor-upgrade-plan.md) — Editor upgrade implementation plan
- [`docs/plans/2026-03-08-trash-toggle-darkmode.md`](docs/plans/2026-03-08-trash-toggle-darkmode.md) — Trash, toggle title, dark mode plan

## Rules

- After completing any phase or major milestone, update CLAUDE.md: check off completed tasks, add any new rules learned from mistakes, and update the "Current Phase" section.
- Next.js 16 with Turbopack (default bundler). No `--turbopack` flag needed. `next lint` removed — use `eslint .` directly.
- `eslint` config option removed from `next.config.ts` in Next.js 16 — don't add it back.
- Clear `.next` directory when upgrading Next.js major versions — stale cache causes "Cannot find module for page" errors.
- Turbo 2.8+ requires `packageManager` field in root `package.json`.
- BubbleMenu from `@tiptap/react` is unavailable in current version — use custom floating toolbar.
- React 19 `useRef` requires an explicit initial value (e.g., `useRef<T>(undefined)`).
- Express 5 `req.params` returns `string | string[]` — cast with `as string`.
- Tiptap needs `immediatelyRender: false` in useEditor config to avoid SSR hydration errors.
- Don't place `app/page.tsx` at root when using `(main)` route group — it shadows the group's `page.tsx`.
- Tiptap 3.x: `@tiptap/extension-text-style` and `@tiptap/extension-table` use named exports (not default). Use `import { TextStyle }` and `import { Table }`.
- `@emoji-mart/react` requires `emoji-mart` as a peer dependency — install both. Use `--legacy-peer-deps` for React 19 compat.
- shadcn/ui v4 (base-nova style) uses `@base-ui/react` primitives. Config in `apps/web/components.json`.
- shadcn/ui color semantics: `primary` = brand color (indigo), `accent` = subtle hover background, `muted` = subtle background, `muted-foreground` = gray text, `destructive` = red/danger. Never use `text-accent` for brand color — use `text-primary`. Never use `text-muted` for gray text — use `text-muted-foreground`.
- Use `bg-card` or `bg-popover` for white surface backgrounds (not `bg-surface` — that variable no longer exists).
- Custom `loading` prop on Button and `label`/`error` props on Input are preserved as extensions to shadcn defaults.
- Theme colors defined as CSS variables in `globals.css` `:root` block. Primary = `#6366F1` (indigo-500), ring = `#6366F1`.
- Tiptap 3.x StarterKit has no `history` option — the Collaboration extension auto-disables history when active.
- `@tiptap/extension-collaboration` requires `@tiptap/y-tiptap` and `y-protocols` as peer deps — install both.
- Hocuspocus WebSocket server runs on port 3002 (`HOCUSPOCUS_PORT`). Frontend connects via `NEXT_PUBLIC_WS_URL`.
- WebSocket auth uses token-based approach (not cookies) since frontend (:3000) and Hocuspocus (:3002) are cross-origin. `/auth/ws-token` endpoint returns the JWT.
- shadcn/ui v4 `TooltipTrigger` (base-ui) does not support `asChild` — just nest children directly.
- Tiptap 3.x StarterKit now includes `Link` and `Underline` — disable them in StarterKit config (`link: false, underline: false`) when importing standalone extensions with custom config.
- `@tiptap/extension-collaboration` (v3.x) uses `@tiptap/y-tiptap` but `@tiptap/extension-collaboration-cursor` uses `y-prosemirror` — they have different `ySyncPluginKey` instances. Must alias `y-prosemirror` → `@tiptap/y-tiptap` in `next.config.ts` (both `turbopack.resolveAlias` and `webpack.resolve.alias`).
- Hocuspocus `Server.requestHandler` override doesn't work (bound in constructor). Use `onRequest` hook in Server config instead. Throw `null` to prevent default response.
- `HocuspocusProvider` has no `connect: false` option — use `onConnect`/`onDisconnect` callbacks for connection state tracking.
- At the start of every new phase, create a `docs/phaseN-plan.md` with the full task breakdown before writing any code.
