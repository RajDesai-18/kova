# Phase 2 Handoff Summary

**Date:** 2026-03-08
**Status:** Complete
**Branch:** `main`

---

## 1. What Was Built

Real-time collaborative editing for Kova, powered by Yjs + Hocuspocus. Multiple users can edit the same document simultaneously with live cursors, presence indicators, and automatic conflict resolution via CRDT.

### Features Delivered

- **Live Collaborative Editing** — Yjs-backed Tiptap editor with automatic CRDT merge, no manual conflict resolution needed
- **Live Cursors** — Multi-color cursors with user name labels, deterministic color assignment per user
- **Presence Bar** — Avatars of active collaborators shown above the editor, updated via Yjs awareness protocol
- **Sidebar Presence Dots** — Colored dots next to each document in the sidebar showing who's editing, updated via REST polling (5s interval)
- **Connection Status Indicator** — Green/yellow/red dot showing WebSocket state, auto-hides when stable, shows "Changes synced" toast on reconnection
- **WebSocket Authentication** — JWT token-based auth for cross-origin WebSocket connections
- **Workspace Membership** — `WorkspaceMember` model enabling shared workspace access between users
- **Document Soft-Delete** — Trash/restore system with permanent delete option
- **Editable Toggle Titles** — Toggle block titles are `contenteditable`, persisted as a node attribute
- **Dark Mode** — App defaults to dark mode via `class="dark"` on `<html>`, semantic color tokens throughout

---

## 2. Architecture

Three servers run concurrently:

```
┌──────────────────────────────────┐
│  Next.js 16 Frontend (:3000)     │
│  Tiptap + Yjs + HocuspocusProvider
└──────┬───────────────┬───────────┘
       │ REST           │ WebSocket
       │ (cookies)      │ (JWT token param)
┌──────▼──────┐  ┌──────▼──────────────┐
│ Express API  │  │ Hocuspocus WS Server │
│ :3001        │  │ :3002                │
└──────┬──────┘  └──────┬──────────────┘
       │                │
  ┌────▼────────────────▼────┐
  │      PostgreSQL :5432     │
  │  (users, docs, ydoc bin)  │
  └──────────┬───────────────┘
        ┌────▼────┐
        │ Redis    │
        │ :6379    │
        └─────────┘
```

### Data Flow

1. User logs in → browser sets httpOnly `token` cookie
2. Document page fetches `GET /auth/ws-token` → receives JWT as JSON (cookies are httpOnly, can't be read by JS)
3. `HocuspocusProvider` connects to `:3002` with JWT in `token` param
4. Hocuspocus `onAuthenticate` verifies JWT, checks user exists, verifies workspace access (owner or member)
5. `Database` extension loads `document.ydoc` binary column into Y.Doc
6. Tiptap Collaboration extension binds to Y.Doc — edits sync automatically via Yjs CRDT
7. On save, Hocuspocus persists both `ydoc` (binary for sync) and `content` (JSON for search/export) via `yDocToProsemirrorJSON()`
8. Awareness protocol propagates cursor positions and user info to all connected clients
9. Sidebar polls `GET /presence` on Hocuspocus HTTP server every 5s for global presence

---

## 3. New & Modified API Endpoints

### Auth Routes (`/api/auth`)

#### `GET /auth/ws-token` — NEW

Returns the JWT from the httpOnly cookie as JSON for WebSocket auth.

```
Request:  GET /api/auth/ws-token (requires auth cookie)
Response: { "token": "eyJhbGci..." }
```

### Document Routes (`/api/documents`)

#### `GET /documents` — MODIFIED

Now returns documents from all workspaces the user owns **or** is a member of (not just owned workspace).

```
Response: { "documents": [{ id, title, icon, parentId, position, createdAt, updatedAt }] }
```

#### `DELETE /documents/:id` — MODIFIED

Changed from hard-delete to **soft-delete**. Sets `isArchived: true` on the document and all children recursively.

```
Response: { "success": true }
```

#### `GET /documents/trash` — NEW

Lists archived documents accessible by the user.

```
Response: { "documents": [{ id, title, icon, parentId, updatedAt }] }
```

#### `POST /documents/:id/restore` — NEW

Restores a soft-deleted document. If parent is still archived, sets `parentId: null` (moves to root).

```
Response: { "success": true }
```

#### `DELETE /documents/:id/permanent` — NEW

Hard-deletes a document from the database. Cascades to children.

```
Response: { "success": true }
```

### Hocuspocus HTTP Endpoint

#### `GET /presence` — NEW (on `:3002`)

Returns active users per document from Hocuspocus awareness states.

```
Response: {
  "doc-id-1": [{ "userId": "...", "name": "Alice", "color": "#EF4444" }],
  "doc-id-2": [{ "userId": "...", "name": "Bob", "color": "#3B82F6" }]
}
```

CORS headers: `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Methods: GET, OPTIONS`.

---

## 4. WebSocket Server (Hocuspocus)

**File:** `apps/server/src/ws/hocuspocus.ts`

### Configuration

| Setting | Value | Env Var |
|---------|-------|---------|
| Port | 3002 | `HOCUSPOCUS_PORT` |
| JWT Secret | `dev-secret` | `JWT_SECRET` |
| Redis | `localhost:6379` | `REDIS_URL` |
| CORS Origin | `http://localhost:3000` | `CORS_ORIGIN` |

### Extensions

1. **`@hocuspocus/extension-database`**
   - `fetch()` — Loads `document.ydoc` (Bytes) from PostgreSQL
   - `store()` — Persists both `ydoc` (Buffer) and `content` (JSON via `yDocToProsemirrorJSON(ydoc, 'default')`)

2. **`@hocuspocus/extension-redis`**
   - Enables cross-instance Y.Doc sync for horizontal scaling
   - Parses `REDIS_URL` for host/port

### Hooks

- **`onAuthenticate`** — JWT verification → user lookup → workspace access check (owner or `WorkspaceMember`)
- **`onRequest`** — Custom HTTP handler for `GET /presence` endpoint

---

## 5. Yjs Integration

### Provider Setup (Frontend)

```typescript
// apps/web/app/(main)/documents/[documentId]/page.tsx
const ydoc = useMemo(() => new Y.Doc(), [documentId]);

const provider = new HocuspocusProvider({
  url: process.env.NEXT_PUBLIC_WS_URL,
  name: documentId,        // Document ID = room name
  document: ydoc,
  token: wsToken,           // JWT from /auth/ws-token
  onConnect: () => setIsConnected(true),
  onDisconnect: () => setIsConnected(false),
});
```

Provider is created/destroyed per document navigation. Y.Doc is memoized by `documentId`.

### Editor Extensions

```typescript
// apps/web/components/editor/editor.tsx
Collaboration.configure({ document: ydoc }),
CollaborationCursor.configure({
  provider,
  user: { name, color },
}),
```

### First-Load Migration

If Y.Doc is empty after sync but `initialContent` (JSON from DB) exists, the editor populates the Y.Doc:

```typescript
provider.on('synced', () => {
  const ydocContent = ydoc.getXmlFragment('default');
  if (ydocContent.length === 0 && initialContent) {
    editor.commands.setContent(initialContent);
  }
});
```

### Critical Alias

`y-prosemirror` must be aliased to `@tiptap/y-tiptap` in `next.config.ts` (both Turbopack and Webpack). Without this, `@tiptap/extension-collaboration` and `@tiptap/extension-collaboration-cursor` create separate `ySyncPluginKey` instances and the cursor plugin crashes.

---

## 6. Presence System

### Editor Presence Bar

**File:** `apps/web/components/editor/presence-bar.tsx`

- Reads from `provider.awareness` (Yjs awareness protocol)
- Updates on awareness `'change'` events (real-time, sub-second)
- Filters out current user, deduplicates by name
- Renders colored avatars with name tooltips

### Sidebar Presence Dots

**File:** `apps/web/components/sidebar/presence-dots.tsx`

- Uses `useGlobalPresence()` hook — polls `GET /presence` on Hocuspocus HTTP every 5s
- Shows up to 3 colored dots per document, "+N" overflow
- Displayed in `DocumentItem` component next to each document title

### User Color Assignment

**File:** `apps/web/lib/user-color.ts`

- `getUserColor(userId)` — deterministic hash-based color from 10-color palette
- Same user always gets the same color across sessions

---

## 7. Database Schema Changes

### Document Model — Modified

```prisma
model Document {
  id          String    @id @default(cuid())
  title       String    @default("Untitled")
  content     Json?                          // Tiptap JSON (for search/export)
  ydoc        Bytes?                         // ← NEW: Y.Doc binary state
  icon        String?
  isArchived  Boolean   @default(false)
  position    Int       @default(0)
  workspaceId String
  parentId    String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  workspace   Workspace @relation(...)
  parent      Document? @relation(...)
  children    Document[] @relation(...)
}
```

The `ydoc` column stores the Y.Doc binary state as `Bytes` (PostgreSQL `BYTEA`). Both `ydoc` and `content` are updated on every save — `ydoc` is the source of truth for collaboration, `content` is a derived JSON representation for full-text search and export.

### WorkspaceMember Model — NEW

```prisma
model WorkspaceMember {
  id          String   @id @default(cuid())
  role        String   @default("editor")
  joinedAt    DateTime @default(now())
  workspaceId String
  userId      String
  workspace   Workspace @relation(...)
  user        User      @relation(...)

  @@unique([workspaceId, userId])
}
```

Enables shared workspace access. Current roles: `"owner"` and `"editor"`. Access checks in both REST API (`document.service.ts:verifyAccess`) and WebSocket auth (`hocuspocus.ts:onAuthenticate`).

### Migration

**File:** `apps/server/prisma/migrations/20260308075601_add_ydoc_and_workspace_members/migration.sql`

---

## 8. Environment Variables

| Variable | Default | Used By | Purpose |
|----------|---------|---------|---------|
| `DATABASE_URL` | `postgresql://kova:kova@localhost:5432/kova` | Prisma | Database connection |
| `REDIS_URL` | `redis://localhost:6379` | Hocuspocus | Cross-instance sync |
| `JWT_SECRET` | `dev-secret` | Express + Hocuspocus | Token signing/verification |
| `PORT` | `3001` | Express | API server port |
| `HOCUSPOCUS_PORT` | `3002` | Hocuspocus | WebSocket server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Hocuspocus | Allowed origin for `/presence` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | Frontend | REST API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:3002` | Frontend | WebSocket connection URL |

---

## 9. New Frontend Files

| File | Purpose |
|------|---------|
| `components/editor/connection-status.tsx` | WebSocket connection indicator (green/yellow/red) |
| `components/editor/presence-bar.tsx` | Active collaborator avatars above editor |
| `components/editor/extensions/font-size.ts` | Custom font-size extension for TextStyle |
| `components/editor/extensions/slash-command.ts` | Tiptap suggestion-based slash command extension |
| `components/sidebar/presence-dots.tsx` | Colored dots showing who's editing each doc |
| `hooks/use-presence.ts` | `useGlobalPresence()` — REST polling for sidebar presence |
| `hooks/use-auth.ts` | Added `useWsToken()` hook |
| `hooks/use-documents.ts` | Added `useTrash()`, `useRestoreDocument()`, `usePermanentDeleteDocument()` |
| `lib/user-color.ts` | Deterministic user color assignment |

### Modified Frontend Files

| File | Changes |
|------|---------|
| `app/(main)/documents/[documentId]/page.tsx` | Added HocuspocusProvider lifecycle, presence bar, connection status, dark mode placeholder color |
| `app/layout.tsx` | Added `dark` class to `<html>` for dark mode default |
| `app/globals.css` | Dark mode CSS variable overrides, semantic color tokens for editor blocks |
| `components/editor/editor.tsx` | Added Collaboration + CollaborationCursor extensions, first-load Y.Doc migration |
| `components/editor/bubble-toolbar.tsx` | Replaced hardcoded colors with semantic tokens (`bg-muted`, `hover:bg-muted`) |
| `components/editor/slash-command.tsx` | Replaced hardcoded colors with semantic tokens |
| `components/editor/emoji-picker.tsx` | Replaced hardcoded colors with semantic tokens |
| `components/sidebar/sidebar.tsx` | Added collapsible Trash section with restore/permanent-delete |
| `components/sidebar/document-tree.tsx` | Added presence dots, trash button on hover |
| `next.config.ts` | Added `y-prosemirror` → `@tiptap/y-tiptap` alias (Turbopack + Webpack) |

---

## 10. Backend File Changes

| File | Changes |
|------|---------|
| `src/ws/hocuspocus.ts` | NEW — Entire Hocuspocus WebSocket server |
| `src/routes/auth.ts` | Added `GET /auth/ws-token` endpoint |
| `src/routes/documents.ts` | Added trash/restore/permanent-delete routes; soft-delete behavior |
| `src/services/document.service.ts` | Multi-workspace document listing, `verifyAccess()`, `listTrash()`, `restore()`, `permanentDelete()` |
| `src/services/auth.service.ts` | Creates `WorkspaceMember` record on registration |
| `prisma/schema.prisma` | Added `ydoc` column, `WorkspaceMember` model |
| `prisma/seed.ts` | Added `demo2@kova.app` user, `WorkspaceMember` records |

---

## 11. Dependencies Added

### Backend (`apps/server`)

| Package | Purpose |
|---------|---------|
| `@hocuspocus/server` | WebSocket collaboration server |
| `@hocuspocus/extension-database` | Prisma persistence for Y.Doc |
| `@hocuspocus/extension-redis` | Cross-instance sync |
| `yjs` | CRDT shared state |
| `y-prosemirror` | Y.Doc ↔ ProseMirror bridge (server-side JSON export) |

### Frontend (`apps/web`)

| Package | Purpose |
|---------|---------|
| `@hocuspocus/provider` | WebSocket client for Hocuspocus |
| `@tiptap/extension-collaboration` | Yjs binding for Tiptap |
| `@tiptap/extension-collaboration-cursor` | Live cursor rendering |
| `@tiptap/extension-text-align` | Text alignment (left/center/right) |
| `@tiptap/extension-superscript` | Superscript formatting |
| `@tiptap/extension-subscript` | Subscript formatting |
| `@tiptap/suggestion` | Slash command menu integration |
| `@tiptap/y-tiptap` | Tiptap's y-prosemirror fork |
| `yjs` | CRDT shared state |
| `y-protocols` | Yjs peer dependency |

---

## 12. Known Issues & Workarounds

| Issue | Workaround | File |
|-------|-----------|------|
| httpOnly cookies can't be read by JS for WebSocket auth | `/auth/ws-token` endpoint returns JWT as JSON | `routes/auth.ts` |
| Y.Doc empty on first load but JSON content exists in DB | Client-side migration on `synced` event | `editor.tsx` |
| `y-prosemirror` vs `@tiptap/y-taptap` module mismatch causes cursor crash | Alias both to `@tiptap/y-tiptap` in `next.config.ts` | `next.config.ts` |
| Hocuspocus `requestHandler` override doesn't work (bound in constructor) | Use `onRequest` hook instead, throw `null` to prevent default response | `hocuspocus.ts` |
| `HocuspocusProvider` has no `connect: false` option | Track state via `onConnect`/`onDisconnect` callbacks | `[documentId]/page.tsx` |
| StarterKit includes Link + Underline, conflicts with standalone imports | Disable in StarterKit: `link: false, underline: false` | `editor.tsx` |
| Nested `contenteditable` in ProseMirror (toggle title) — keyboard events intercepted | Direct DOM manipulation in tests, `keydown` listener for Enter prevention | `toggle.ts` |
| Sidebar presence can't use WebSocket (different rooms per doc) | REST polling `GET /presence` every 5s (good enough for sidebar) | `use-presence.ts` |

---

## 13. E2E Tests

| Spec File | Tests | Coverage |
|-----------|-------|----------|
| `e2e/full-flow.spec.ts` | 2 | Register → login → create → edit → sidebar → logout |
| `e2e/editor-features.spec.ts` | 34 | Slash commands, inline toolbar, emoji picker, toggle, callout |
| `e2e/collaboration.spec.ts` | 3 | Two-user sync, live cursors, presence indicators |
| `e2e/new-features.spec.ts` | 13 | Dark mode (3), document trash (6), editable toggle title (4) |

---

## 14. Seed Data

Two demo accounts for testing collaboration:

| Email | Password | Role |
|-------|----------|------|
| `demo@kova.app` | `password123` | Workspace owner, pre-seeded documents |
| `demo2@kova.app` | `password123` | Member of demo's workspace (role: `editor`) |

Pre-seeded documents in demo's workspace: "Getting Started" (with child "Keyboard Shortcuts"), "Project Notes", "Ideas".

---

## 15. Phase 3 Considerations: AI Integration

### What Phase 3 needs to know

**Editor access:**
- Tiptap editor instance is available via `useEditor()` in `editor.tsx`
- `editor.getJSON()` returns the full document as structured JSON
- `editor.getText()` returns plain text (useful for AI context)
- `editor.commands.insertContent()` can insert AI-generated content at cursor
- The editor is collaborative — AI insertions via commands will automatically sync to all connected users

**Document content:**
- `document.content` (JSON column) is always up-to-date — Hocuspocus persists it on every save
- Can be used server-side for AI context without needing to deserialize Y.Doc
- `document.ydoc` is the binary source of truth — don't modify it directly

**Streaming responses:**
- For streaming AI responses into the editor, insert content progressively via `editor.commands.insertContent()` or use `editor.chain().insertContentAt(pos, text).run()`
- Yjs will handle syncing partial content to other users in real-time
- Consider using a dedicated "AI writing" cursor/highlight to show other users that AI is generating

**API patterns:**
- All endpoints use `{ error: { code, message } }` error format
- Auth is via httpOnly cookies — no Bearer token needed for REST calls
- Use `credentials: 'include'` on all fetch calls (already configured in `lib/api.ts`)

**Server-side AI:**
- Express server at `:3001` — add AI routes alongside existing `/api/auth` and `/api/documents`
- Prisma client available via `import { prisma } from '../lib/prisma.js'`
- `JWT_SECRET` env var is shared between Express and Hocuspocus — reuse for any new auth needs

**WebSocket considerations:**
- If AI needs to push updates to the editor, it can either:
  1. Insert via REST API + Y.Doc manipulation on the server (complex — requires Yjs server-side)
  2. Use a separate SSE/WebSocket channel from Express to the frontend (simpler — recommended)
- The Hocuspocus server should NOT be modified for AI — keep it focused on document sync

**Dark mode:**
- App defaults to dark mode (`class="dark"` on `<html>`)
- All UI uses semantic color tokens — any new AI UI components should use `bg-card`, `text-foreground`, `border-border`, etc.
- Never use hardcoded colors like `bg-gray-100` — always use semantic tokens
