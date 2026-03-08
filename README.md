# Kova

A collaborative, real-time document workspace — like Notion, built from scratch.

<!-- ![Kova Screenshot](docs/screenshots/kova-preview.png) -->

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui |
| Editor | Tiptap 2.x, Yjs, Hocuspocus |
| State | Zustand 5, TanStack React Query 5 |
| Backend | Express 5, Prisma 6, PostgreSQL 16 |
| Real-time | Hocuspocus WebSocket server, Redis 7 |
| Monorepo | npm workspaces, Turborepo |
| Auth | JWT (httpOnly cookies), bcrypt |
| Testing | Playwright (E2E) |

## Features

### Phase 1 — Foundation
- Email/password authentication (register, login, logout)
- Document CRUD with nested tree structure (parent/child)
- Rich text editor with slash commands (12 block types)
- Inline bubble toolbar (bold, italic, underline, strikethrough, code, link, color, highlight)
- Emoji picker for document icons
- Toggle blocks, callout blocks, tables, task lists
- Collapsible sidebar with document tree navigation
- Auto-created workspaces scoped to each user

### Phase 2 — Real-Time Collaboration
- Live collaborative editing via Yjs + Hocuspocus
- Multi-color live cursors with user labels
- Presence indicators (editor bar + sidebar dots)
- Connection status indicator with reconnection handling
- WebSocket authentication with JWT tokens
- Redis-backed cross-instance sync
- Workspace membership model for shared access

### Recent Additions
- Document soft-delete with trash and restore
- Editable toggle block titles
- Dark mode (default)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Client                           │
│  Next.js 16 (App Router) + React 19 + Tiptap Editor    │
│  Zustand (UI state) + React Query (server state)        │
└──────────┬─────────────────────────────┬────────────────┘
           │ REST API                    │ WebSocket
           │ :3001                       │ :3002
┌──────────▼──────────┐    ┌─────────────▼────────────────┐
│   Express 5 API     │    │  Hocuspocus WebSocket Server  │
│   JWT Auth           │    │  Yjs Sync + Awareness         │
│   Prisma 6 ORM       │    │  JWT Auth                     │
└──────────┬──────────┘    └──────────┬───────────────────┘
           │                          │
     ┌─────▼──────────────────────────▼─────┐
     │           PostgreSQL 16               │
     │   Users, Workspaces, Documents,       │
     │   Y.Doc binary, JSON content          │
     └──────────────────┬───────────────────┘
                        │
                  ┌─────▼─────┐
                  │  Redis 7   │
                  │  WS Sync   │
                  └───────────┘
```

## Local Setup

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- Git

### 1. Clone & install

```bash
git clone https://github.com/RajDesai-18/kova.git
cd kova
npm install
```

### 2. Environment

```bash
cp .env.example apps/server/.env
cp .env.example apps/web/.env.local
```

Default values work out of the box for local development.

### 3. Start infrastructure

```bash
docker compose up -d   # PostgreSQL + Redis
```

### 4. Database setup

```bash
npm run db:push         # Apply Prisma schema
npm run db:seed         # Seed demo users
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with:
- `demo@kova.app` / `password123`
- `demo2@kova.app` / `password123` (for testing collaboration)

## Project Structure

```
kova/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, register pages
│   │   │   ├── (main)/         # Authenticated pages (sidebar layout)
│   │   │   └── globals.css     # Tailwind v4 theme
│   │   ├── components/
│   │   │   ├── editor/         # Tiptap editor, toolbar, extensions
│   │   │   ├── sidebar/        # Document tree, trash section
│   │   │   └── ui/             # shadcn/ui components
│   │   ├── hooks/              # React Query hooks
│   │   ├── stores/             # Zustand stores
│   │   └── lib/                # API client, utilities
│   └── server/                 # Express 5 API
│       └── src/
│           ├── routes/         # Auth, documents endpoints
│           ├── services/       # Business logic
│           ├── middleware/      # Auth middleware
│           ├── ws/             # Hocuspocus WebSocket server
│           └── lib/            # Prisma client
├── packages/
│   └── shared/                 # Zod schemas, shared types
├── e2e/                        # Playwright E2E tests
├── docs/                       # Specs, plans, architecture
├── docker-compose.yml
└── turbo.json
```

## Roadmap

- [x] **Phase 1** — Foundation (auth, CRUD, editor, sidebar)
- [x] **Phase 2** — Real-Time Collaboration (Yjs, cursors, presence)
- [ ] **Phase 3** — AI Integration (summarization, writing assist, semantic search)
- [ ] **Phase 4** — Polish & Performance (offline, search, optimizations)
- [ ] **Phase 5** — Deployment & Launch (CI/CD, hosting, monitoring)

## License

MIT
