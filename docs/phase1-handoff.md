# Phase 1 Handoff Summary

**Date:** 2026-03-08
**Status:** Complete
**Branch:** `feature/phase1-foundation`

---

## 1. What Was Built

Kova is a Notion-like collaborative workspace — a full-stack app with auth, hierarchical documents, a rich text editor, and a polished UI.

### Features Delivered

- **Authentication** — Email/password register + login with JWT in httpOnly cookies, auto-created workspace per user, 7-day token expiry
- **Document CRUD** — Create, read, update, delete documents with hierarchical parent/child tree, soft ordering by position, archive flag
- **Rich Text Editor** — Tiptap 3.x with 15 extensions: headings (1–3), bold/italic/underline/strikethrough/code, bullet + numbered + to-do lists, blockquotes, code blocks, horizontal rules, tables (3×3), links, text color (8 colors), highlight (8 colors), typography auto-corrections
- **Custom Block Types** — Toggle (collapsible `<details>/<summary>`) and Callout (emoji + colored border box)
- **Slash Commands** — 12 commands triggered by `/` at line start: Heading 1/2/3, Bullet List, Numbered List, To-do List, Toggle List, Callout, Code Block, Blockquote, Divider, Table. Keyboard navigable, filterable.
- **Inline Toolbar** — Floating bubble toolbar on text selection with 9 buttons: Bold, Italic, Underline, Strikethrough, Code, Link (URL input), Text Color, Highlight, Comment (placeholder)
- **Emoji Picker** — Full `emoji-mart` picker for setting document icons next to title
- **Sidebar** — Collapsible sidebar with recursive document tree, user dropdown (avatar + logout), new page button, expand/collapse child documents
- **Skeleton Loading** — Loading states for auth check, document fetch, and document list
- **E2E Tests** — 2 Playwright tests covering full register→login→create→edit→sidebar→logout flow and demo account login with seeded data

---

## 2. Tech Stack & Dependencies

### Monorepo

| Package | Purpose |
|---------|---------|
| `apps/web` | Next.js 16.1.6 frontend (App Router, Turbopack) |
| `apps/server` | Express 5 API server |
| `packages/shared` | Zod schemas shared between frontend and backend |

Orchestrated by Turborepo (`turbo.json`), npm workspaces.

### Frontend (`apps/web`)

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `next` | ^16 | Framework (App Router, Turbopack default) |
| `react` / `react-dom` | ^19 | UI library |
| `tailwindcss` | ^4 | CSS-first config (no tailwind.config.js) |
| `shadcn` | ^4.0.0 | UI component system (base-nova style) |
| `@base-ui/react` | ^1.2.0 | Headless primitives (used by shadcn) |
| `@tiptap/react` + extensions | ^3.20.1 | Rich text editor |
| `@tanstack/react-query` | ^5.90.21 | Server state management |
| `zustand` | ^5.0.11 | Client state (sidebar toggle) |
| `framer-motion` | ^12.35.1 | Sidebar animation |
| `sonner` | ^2.0.7 | Toast notifications |
| `emoji-mart` + `@emoji-mart/react` + `@emoji-mart/data` | ^5.6 / ^1.1 | Emoji picker |
| `lucide-react` | ^0.577 | Icons |
| `class-variance-authority` | ^0.7 | Variant styling |
| `clsx` + `tailwind-merge` | ^2.1 / ^3.5 | Class merging (`cn()` utility) |
| `cmdk` | ^1.1 | Command palette primitive |

### Backend (`apps/server`)

| Dependency | Version | Purpose |
|-----------|---------|---------|
| `express` | ^5 | HTTP framework |
| `@prisma/client` | ^6 | Database ORM |
| `bcryptjs` | ^3 | Password hashing (12 salt rounds) |
| `jsonwebtoken` | ^9 | JWT signing/verification |
| `cors` | ^2 | Cross-origin requests |
| `cookie-parser` | ^1 | Cookie parsing |
| `zod` | ^3 | Runtime validation |

### Infrastructure

| Service | Image | Port |
|---------|-------|------|
| PostgreSQL | `postgres:16-alpine` | 5432 |
| Redis | `redis:7-alpine` | 6379 |

Redis is provisioned but **not yet used** — it's ready for Phase 2 (session store, pub/sub, caching).

---

## 3. Database Schema

```prisma
model User {
  id        String     @id @default(cuid())
  email     String     @unique
  name      String
  password  String                          // bcrypt hash
  createdAt DateTime   @default(now())      @map("created_at")
  updatedAt DateTime   @updatedAt           @map("updated_at")
  workspace Workspace?
  @@map("users")
}

model Workspace {
  id        String     @id @default(cuid())
  name      String
  createdAt DateTime   @default(now())      @map("created_at")
  updatedAt DateTime   @updatedAt           @map("updated_at")
  userId    String     @unique              @map("user_id")
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  documents Document[]
  @@map("workspaces")
}

model Document {
  id          String     @id @default(cuid())
  title       String     @default("Untitled")
  content     Json?                          // Tiptap JSON
  icon        String?                        // emoji character
  isArchived  Boolean    @default(false)     @map("is_archived")
  position    Int        @default(0)
  createdAt   DateTime   @default(now())     @map("created_at")
  updatedAt   DateTime   @updatedAt          @map("updated_at")
  workspaceId String                         @map("workspace_id")
  workspace   Workspace  @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  parentId    String?                        @map("parent_id")
  parent      Document?  @relation("DocumentTree", fields: [parentId], references: [id], onDelete: Cascade)
  children    Document[] @relation("DocumentTree")
  @@map("documents")
}
```

**Key details:**
- All tables use snake_case column names (`@map`)
- `Document.content` is `Json?` — stores Tiptap editor JSON (`editor.getJSON()`)
- Documents form a tree via self-referential `parentId` → `parent`/`children` relation
- Cascade deletes: deleting a user deletes their workspace, deleting a workspace deletes its documents, deleting a parent document deletes children
- No indexes beyond the implicit ones on `@id` and `@unique` fields

---

## 4. API Endpoints

Base URL: `http://localhost:3001/api`

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Create account |
| `POST` | `/auth/login` | No | Sign in |
| `POST` | `/auth/logout` | No | Sign out (clears cookie) |
| `GET` | `/auth/me` | Yes | Get current user |

#### POST /auth/register

```
Request:  { email: string, name: string (min 2), password: string (min 8) }
Response: { user: { id, email, name } }              201 Created
          Sets httpOnly cookie: token (JWT, 7d expiry)
          Auto-creates workspace: "{name}'s Workspace"
Errors:   { error: { code: 'VALIDATION_ERROR', message } }   400
          { error: { code: 'EMAIL_EXISTS', message } }        409
```

#### POST /auth/login

```
Request:  { email: string, password: string (min 1) }
Response: { user: { id, email, name } }              200 OK
          Sets httpOnly cookie: token (JWT, 7d expiry)
Errors:   { error: { code: 'VALIDATION_ERROR', message } }      400
          { error: { code: 'INVALID_CREDENTIALS', message } }   401
```

#### POST /auth/logout

```
Request:  (empty)
Response: { success: true }                           200 OK
          Clears token cookie
```

#### GET /auth/me

```
Response: { user: { id, email, name } }               200 OK
Errors:   { error: { code: 'UNAUTHORIZED', message } }   401
          { error: { code: 'USER_NOT_FOUND', message } }  404
```

### Documents

All require JWT token in httpOnly cookie.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/documents` | Yes | List workspace documents |
| `POST` | `/documents` | Yes | Create document |
| `GET` | `/documents/:id` | Yes | Get document by ID |
| `PATCH` | `/documents/:id` | Yes | Update document |
| `DELETE` | `/documents/:id` | Yes | Delete document |

#### GET /documents

```
Response: { documents: [{ id, title, icon, parentId, position, createdAt, updatedAt }] }
          Filtered: workspaceId = user's workspace, isArchived = false
          Ordered: position ASC, createdAt ASC
Errors:   { error: { code: 'WORKSPACE_NOT_FOUND', message } }  404
```

#### POST /documents

```
Request:  { title?: string, parentId?: string|null, content?: any, icon?: string }
          title defaults to "Untitled"
Response: { document: { id, title, parentId, content, icon, workspaceId, isArchived, position, createdAt, updatedAt } }  201
```

#### GET /documents/:id

```
Response: { document: { id, title, parentId, content, icon, workspaceId, isArchived, position, createdAt, updatedAt } }  200
Errors:   { error: { code: 'DOCUMENT_NOT_FOUND', message } }  404
```

#### PATCH /documents/:id

```
Request:  { title?: string, content?: any, icon?: string|null, isArchived?: boolean, parentId?: string|null, position?: number }
          All fields optional
Response: { document: { ... full document } }         200
```

#### DELETE /documents/:id

```
Response: { success: true }                            200
          Hard-deletes document (no soft delete)
```

### Health Check

```
GET /api/health → { status: 'ok' }
```

### Cookie Configuration

```
httpOnly: true
secure: NODE_ENV === 'production'
sameSite: 'lax'
maxAge: 7 days
path: '/'
```

### Error Format (all endpoints)

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Validation Schemas (packages/shared)

```typescript
// auth.ts
registerSchema = { email: z.string().email(), name: z.string().min(2), password: z.string().min(8) }
loginSchema    = { email: z.string().email(), password: z.string().min(1) }

// document.ts
createDocumentSchema = { title?: string, parentId?: string|null, content?: any, icon?: string }
updateDocumentSchema = { title?: string, content?: any, icon?: string|null, isArchived?: boolean, parentId?: string|null, position?: number }
```

---

## 5. Frontend Routes & Components

### Routes

```
app/
├── layout.tsx                              Root layout (Geist font, Providers)
├── (auth)/
│   ├── layout.tsx                          Centered max-w-sm container
│   ├── login/page.tsx                      Email + password form
│   └── register/page.tsx                   Name + email + password form
└── (main)/
    ├── layout.tsx                          Auth guard, sidebar + header shell
    ├── page.tsx                            "Welcome to Kova" landing
    └── documents/[documentId]/page.tsx     Editor page with title + emoji picker
```

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| `Editor` | `components/editor/editor.tsx` | Tiptap editor with all extensions |
| `BubbleToolbar` | `components/editor/bubble-toolbar.tsx` | Floating formatting toolbar |
| `SlashCommand` | `components/editor/slash-command.tsx` | `/` command palette |
| `EmojiPicker` | `components/editor/emoji-picker.tsx` | Document icon picker |
| `Toggle` | `components/editor/extensions/toggle.ts` | Custom Tiptap toggle node |
| `Callout` | `components/editor/extensions/callout.ts` | Custom Tiptap callout node |
| `Sidebar` | `components/sidebar/sidebar.tsx` | Sidebar with user menu + doc tree |
| `DocumentTree` | `components/sidebar/document-tree.tsx` | Recursive document tree |
| `Button` | `components/ui/button.tsx` | shadcn button + `loading` prop |
| `Input` | `components/ui/input.tsx` | shadcn input + `label`/`error` props |
| `Avatar` | `components/ui/avatar.tsx` | shadcn avatar with fallback |
| `DropdownMenu` | `components/ui/dropdown-menu.tsx` | shadcn dropdown menu |
| `Dialog` | `components/ui/dialog.tsx` | shadcn modal dialog |
| `Popover` | `components/ui/popover.tsx` | shadcn popover |
| `Command` | `components/ui/command.tsx` | shadcn command palette (cmdk) |
| `Tooltip` | `components/ui/tooltip.tsx` | shadcn tooltip |
| `Skeleton` | `components/ui/skeleton.tsx` | Loading placeholder |
| `Separator` | `components/ui/separator.tsx` | Visual divider |

### Hooks

| Hook | File | API Call | Purpose |
|------|------|----------|---------|
| `useUser()` | `hooks/use-auth.ts` | `GET /auth/me` | Current user (query) |
| `useLogin()` | `hooks/use-auth.ts` | `POST /auth/login` | Sign in (mutation) |
| `useRegister()` | `hooks/use-auth.ts` | `POST /auth/register` | Sign up (mutation) |
| `useLogout()` | `hooks/use-auth.ts` | `POST /auth/logout` | Sign out (mutation) |
| `useDocuments()` | `hooks/use-documents.ts` | `GET /documents` | All workspace docs (query) |
| `useDocument(id)` | `hooks/use-documents.ts` | `GET /documents/:id` | Single doc with content (query) |
| `useCreateDocument()` | `hooks/use-documents.ts` | `POST /documents` | Create doc (mutation) |
| `useUpdateDocument()` | `hooks/use-documents.ts` | `PATCH /documents/:id` | Update doc (mutation) |
| `useDeleteDocument()` | `hooks/use-documents.ts` | `DELETE /documents/:id` | Delete doc (mutation) |

### Stores

| Store | File | State |
|-------|------|-------|
| `useUIStore` | `stores/ui.ts` | `{ sidebarOpen: boolean, toggleSidebar(), setSidebarOpen() }` |

### Lib

| File | Purpose |
|------|---------|
| `lib/api.ts` | `api<T>(path, options)` — fetch wrapper with credentials, error parsing, JSON serialization. Base URL from `NEXT_PUBLIC_API_URL`. |
| `lib/providers.tsx` | `Providers` — wraps app with QueryClientProvider (staleTime: 60s, retry: false) + Sonner Toaster |
| `lib/utils.ts` | `cn()` — class merging utility (clsx + tailwind-merge) |

---

## 6. Environment Variables

```bash
# .env.example — copy to .env.local (frontend) and .env (server)
DATABASE_URL=postgresql://kova:kova@localhost:5432/kova
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

| Variable | Used By | Default | Purpose |
|----------|---------|---------|---------|
| `DATABASE_URL` | Server (Prisma) | — | PostgreSQL connection string |
| `REDIS_URL` | — | — | Redis connection (provisioned, not yet used) |
| `JWT_SECRET` | Server | `'dev-secret'` | JWT signing secret |
| `PORT` | Server | `3001` | Express port |
| `NEXT_PUBLIC_API_URL` | Frontend | `'http://localhost:3001/api'` | API base URL |
| `NODE_ENV` | Server | — | Controls cookie `secure` flag |
| `CORS_ORIGIN` | Server | `['http://localhost:3000', 'http://localhost:3002']` | Allowed origins |

---

## 7. How to Run

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Install dependencies
npm install

# 3. Push schema to DB
npm run db:push

# 4. Seed demo data
npm run db:seed        # creates demo@kova.app / password123

# 5. Start dev servers
npm run dev            # starts both frontend (:3000) and backend (:3001)

# 6. Run E2E tests (servers must be running)
npx playwright test
```

---

## 8. Known Issues & Workarounds

| Issue | Workaround | Tracking |
|-------|-----------|----------|
| `@emoji-mart/react` doesn't officially support React 19 | Install with `--legacy-peer-deps` | Works fine at runtime |
| `BubbleMenu` from `@tiptap/react` unavailable in 3.x | Built custom floating toolbar using `coordsAtPos` | Permanent solution |
| Tiptap `@tiptap/extension-text-style` and `@tiptap/extension-table` use named exports | `import { TextStyle }` and `import { Table }` (not default) | Tiptap 3.x change |
| `emoji-mart` is required peer dep of `@emoji-mart/react` (not just `@emoji-mart/data`) | Install all three: `emoji-mart`, `@emoji-mart/data`, `@emoji-mart/react` | — |
| Express 5 `req.params` returns `string \| string[]` | Cast with `as string` at usage sites | Express 5 typing |
| React 19 `useRef` requires explicit initial value | Pass `useRef<T>(undefined)` instead of `useRef<T>()` | React 19 change |
| Next.js 16 removed `next lint` and `eslint` config | Use `eslint .` directly; don't add `eslint` key to `next.config.ts` | — |
| Turbo 2.8+ requires `packageManager` field | Set `"packageManager": "npm@11.11.0"` in root `package.json` | — |
| No `app/page.tsx` at root level | Would shadow `(main)/page.tsx` — route group handles it | — |
| Document delete is hard-delete | No trash/undo. `isArchived` field exists but delete bypasses it. | Could soft-delete instead |
| No password reset flow | Not implemented | Phase 2+ |
| No email verification | Not implemented | Phase 2+ |
| Redis provisioned but unused | Ready for Phase 2 | — |

---

## 9. Phase 2 Considerations: Real-Time Collaboration (Yjs + Hocuspocus)

### What Phase 2 needs to know about the current editor

**Document content format:** The `Document.content` field stores Tiptap JSON (`editor.getJSON()`) as a Prisma `Json` column. When Yjs is added, content will need to be stored as a Y.Doc binary (Uint8Array) instead, or Tiptap JSON will serve as the initial load format that gets converted to a Y.Doc.

**Tiptap extensions registered:** Phase 2 must register the same extensions on the Hocuspocus server side as the client, or use a schema-less approach. Current extensions:
- StarterKit (heading 1–3, bold, italic, strikethrough, code, bulletList, orderedList, blockquote, codeBlock, horizontalRule)
- Placeholder, Typography, Link, Underline
- TextStyle, Color, Highlight (multicolor)
- TaskList, TaskItem (nested)
- Table, TableRow, TableHeader, TableCell
- Toggle (custom), Callout (custom)

**Custom extensions:** `Toggle` and `Callout` are custom Tiptap Node extensions in `components/editor/extensions/`. They define custom `parseHTML`/`renderHTML` and commands. The Hocuspocus server does not need to know about rendering, but if server-side document processing is needed (search indexing, AI features), these schemas must be available server-side.

**Editor update flow:** Currently, content saves are debounced (500ms) via `onUpdate` → `useUpdateDocument` mutation → `PATCH /documents/:id`. With Yjs, this HTTP save will be replaced by Yjs sync through Hocuspocus WebSocket. The debounced `onUpdate` callback should be removed or repurposed for local-only concerns.

**Slash command and toolbar:** These are independent of content sync — they manipulate the editor programmatically via `editor.chain().focus()...run()`. They will continue to work with Yjs since Yjs operates at the CRDT level below Tiptap's command API.

### Database migration path

The `Document.content` column is currently `Json?`. Options for Phase 2:
1. **Add a `ydoc` column** (`Bytes?`) alongside `content` — Hocuspocus stores Y.Doc binary, `content` becomes a read cache for search/SSR
2. **Replace `content` with `ydoc`** — simpler but loses easy JSON queryability
3. **Use Hocuspocus's built-in persistence** (e.g., `@hocuspocus/extension-database`) to manage storage separately

### Auth integration

Hocuspocus needs to authenticate WebSocket connections. The current JWT is stored in an httpOnly cookie. Options:
- Pass the cookie on the WebSocket upgrade request (same origin, cookies are sent automatically)
- Extract `userId` from the JWT in Hocuspocus's `onAuthenticate` hook using the same `JWT_SECRET`
- The `authenticate` middleware logic in `apps/server/src/middleware/auth.ts` can be reused

### Redis

Redis is already provisioned (`redis:7-alpine` on port 6379, `REDIS_URL` env var). Hocuspocus can use Redis for:
- Cross-instance Y.Doc sync (if running multiple Hocuspocus servers)
- Presence/awareness data (cursor positions, user colors)
- Pub/sub for real-time events

### Workspace scoping

Documents are scoped to a workspace (`workspaceId`). Currently one user = one workspace (1:1). If Phase 2 adds multi-user workspaces (shared editing), the workspace model needs a many-to-many `User ↔ Workspace` relation, and document access checks must verify workspace membership rather than ownership.

### API client

`lib/api.ts` is a thin fetch wrapper with `credentials: 'include'`. For WebSocket connections, you won't use this — you'll connect directly to the Hocuspocus WebSocket server. But the REST API will still be used for document listing, creation, deletion, and metadata updates (title, icon, archive).

### What does NOT need to change

- **Sidebar and document tree** — purely metadata-driven (title, icon, parentId), unrelated to content sync
- **Auth pages** — login/register are independent
- **UI components** — shadcn/ui components are content-agnostic
- **Slash commands and toolbar** — work at the Tiptap command level, compatible with Yjs
- **Emoji picker** — sets `icon` field via REST API, not content

---

## 10. File Tree (key files only)

```
kova/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── layout.tsx                           Root layout
│   │   │   ├── globals.css                          Theme + editor CSS
│   │   │   ├── (auth)/
│   │   │   │   ├── layout.tsx                       Auth container
│   │   │   │   ├── login/page.tsx                   Login form
│   │   │   │   └── register/page.tsx                Register form
│   │   │   └── (main)/
│   │   │       ├── layout.tsx                       Protected shell
│   │   │       ├── page.tsx                         Welcome page
│   │   │       └── documents/[documentId]/page.tsx  Editor page
│   │   ├── components/
│   │   │   ├── editor/
│   │   │   │   ├── editor.tsx                       Tiptap editor
│   │   │   │   ├── bubble-toolbar.tsx               Inline toolbar
│   │   │   │   ├── slash-command.tsx                Slash command menu
│   │   │   │   ├── emoji-picker.tsx                 Emoji picker
│   │   │   │   └── extensions/
│   │   │   │       ├── toggle.ts                    Toggle extension
│   │   │   │       └── callout.ts                   Callout extension
│   │   │   ├── sidebar/
│   │   │   │   ├── sidebar.tsx                      Sidebar
│   │   │   │   └── document-tree.tsx                Document tree
│   │   │   └── ui/                                  shadcn/ui components
│   │   │       ├── index.ts                         Barrel export
│   │   │       ├── button.tsx                       Button (+ loading)
│   │   │       ├── input.tsx                        Input (+ label/error)
│   │   │       ├── avatar.tsx, dialog.tsx, dropdown-menu.tsx,
│   │   │       │   popover.tsx, command.tsx, tooltip.tsx,
│   │   │       │   skeleton.tsx, separator.tsx, textarea.tsx,
│   │   │       │   input-group.tsx
│   │   │       └── ...
│   │   ├── hooks/
│   │   │   ├── use-auth.ts                          Auth hooks
│   │   │   └── use-documents.ts                     Document hooks
│   │   ├── stores/
│   │   │   └── ui.ts                                UI state (Zustand)
│   │   ├── lib/
│   │   │   ├── api.ts                               API client
│   │   │   ├── providers.tsx                         QueryClient + Toaster
│   │   │   └── utils.ts                             cn() utility
│   │   ├── types/
│   │   │   └── emoji-mart.d.ts                      Emoji mart types
│   │   ├── components.json                          shadcn config
│   │   ├── next.config.ts                           Next.js config
│   │   ├── tsconfig.json                            TypeScript config
│   │   └── package.json
│   └── server/
│       ├── prisma/
│       │   ├── schema.prisma                        Database schema
│       │   └── seed.ts                              Demo data seed
│       ├── src/
│       │   ├── index.ts                             Express app entry
│       │   ├── routes/
│       │   │   ├── auth.ts                          Auth routes
│       │   │   └── documents.ts                     Document routes
│       │   ├── middleware/
│       │   │   ├── auth.ts                          JWT auth middleware
│       │   │   └── validate.ts                      Zod validation middleware
│       │   ├── services/
│       │   │   ├── auth.service.ts                  Auth business logic
│       │   │   └── document.service.ts              Document business logic
│       │   └── lib/
│       │       └── prisma.ts                        Prisma client singleton
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/
│       └── src/
│           ├── index.ts                             Barrel export
│           └── schemas/
│               ├── auth.ts                          registerSchema, loginSchema
│               └── document.ts                      createDocumentSchema, updateDocumentSchema
├── e2e/
│   ├── full-flow.spec.ts                            Playwright E2E tests
│   └── screenshots/                                 Test screenshots
├── docs/
│   ├── spec.md                                      Product specification
│   ├── architecture.md                              System architecture
│   ├── phase1-plan.md                               Phase 1 execution plan
│   ├── phase1-handoff.md                            This document
│   └── plans/
│       ├── 2026-03-07-editor-upgrade-design.md      Editor upgrade design
│       └── 2026-03-07-editor-upgrade-plan.md        Editor upgrade impl plan
├── docker-compose.yml                               Postgres + Redis
├── turbo.json                                       Turborepo config
├── package.json                                     Root workspace config
├── .env.example                                     Environment template
└── CLAUDE.md                                        Project instructions
```

---

## 11. Seed Data

The seed script (`npm run db:seed`) creates:

- **User:** `demo@kova.app` / `password123` (name: "Demo User")
- **Workspace:** "Demo User's Workspace"
- **Documents:**
  1. 🚀 Getting Started — Welcome guide with tips
  2. ⌨️ Keyboard Shortcuts — Child of Getting Started
  3. 📋 Project Notes — For tracking project ideas
  4. 💡 Ideas — For capturing ideas

All documents have rich Tiptap JSON content (headings, paragraphs, lists).

---

## 12. E2E Test Coverage

File: `e2e/full-flow.spec.ts` (2 tests)

**Test 1: Full user flow**
Register → login → create document → edit title → type in editor → verify sidebar → toggle sidebar → logout → login again → verify data persisted

**Test 2: Demo account**
Login with `demo@kova.app` → verify seeded documents in sidebar → click "Getting Started" → verify editor loads with content

Run: `npx playwright test` (requires dev servers running on :3000 and :3001)
