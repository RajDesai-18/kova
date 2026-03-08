# Phase 2: Real-Time Collaboration — Plan & Status

**Status:** Complete
**Branch:** `feature/phase1-foundation`

---

## Steps

### Step 1: Prisma Schema Migration [x]

Added `ydoc Bytes?` column to the `Document` model for persisting Y.Doc binary state. Created `WorkspaceMember` model with `userId`/`workspaceId` composite unique constraint and `role` field to support shared workspace access between multiple users.

### Step 2: Hocuspocus WebSocket Server [x]

Built a Hocuspocus server on port 3002 (`HOCUSPOCUS_PORT`) with three key pieces: JWT token-based auth via `onAuthenticate` hook (cross-origin prevents cookies), database persistence using `@hocuspocus/extension-database` (loads/stores Y.Doc binary from `ydoc` column, derives Tiptap JSON for `content` column via `yDocToProsemirrorJSON`), and Redis extension for cross-instance sync. Presence endpoint exposed via `onRequest` hook at `GET /presence`.

### Step 3: Frontend Yjs + Tiptap Collaboration Integration [x]

Integrated `@tiptap/extension-collaboration` with Yjs `Y.Doc` and `@tiptap/extension-collaboration-cursor` for live cursors. Required aliasing `y-prosemirror` → `@tiptap/y-tiptap` in `next.config.ts` (both Turbopack and webpack) because the two extensions use different Yjs integration packages with conflicting `ySyncPluginKey` instances. Added client-side first-load migration: if Y.Doc XML fragment is empty after sync, editor populates from existing JSON content.

### Step 4: Live Cursor CSS Styles [x]

Added `.collaboration-cursor__caret` and `.collaboration-cursor__label` styles in `globals.css`. The `CollaborationCursor` extension renders these elements automatically — caret shows cursor position with user color, label shows user name above the cursor.

### Step 5: Presence System [x]

Built `PresenceBar` component in the editor header showing connected users' avatars using Hocuspocus awareness state (real-time, no polling). Built sidebar presence dots using REST polling (`GET /presence` on Hocuspocus HTTP server, 5-second interval) to show colored indicators next to documents with active editors.

### Step 6: Connection Status Indicator [x]

Built `ConnectionStatus` component subscribing to provider status events. Shows green dot when connected, yellow pulsing dot with "Connecting..." text during connection, and red dot with "Offline" text when disconnected. Displays Sonner toast on reconnection to confirm changes synced.

### Step 7: Multi-User Seed + Workspace Membership Access Checks [x]

Created `demo2@kova.app` / `password123` user in seed script. Added `WorkspaceMember` records so demo2 is an "editor" of demo's workspace. Updated `DocumentService.list()` to accept `userId` and query all workspaces the user owns or is a member of (deduplicated). Updated `verifyAccess()` to check both ownership and membership.

### Step 8: End-to-End Verification [x]

Verified two-user collaboration flow: both users see each other's cursors with name labels, typing in one browser appears in the other within seconds, presence bar shows both avatars. Fixed multiple bugs during verification: duplicate Tiptap extensions (StarterKit now bundles Link/Underline), cursor plugin crash (y-prosemirror module mismatch), presence endpoint failure (requestHandler override doesn't work), and document visibility for shared workspace members.

### Step 9: Playwright Screenshots [x]

Captured collaboration screenshots in `e2e/screenshots/collab-*.png`. Playwright E2E tests: 3/3 pass (register flow, demo login, collaboration sync between two browser contexts).

---

## Key Technical Decisions

1. **Token-based WS auth** — Cross-origin `:3000` → `:3002` prevents cookie auto-send. `/auth/ws-token` endpoint returns JWT.
2. **Client-side first-load migration** — Empty Y.Doc populated from existing JSON content on first connect.
3. **Module aliasing** — `y-prosemirror` → `@tiptap/y-tiptap` resolves conflicting ySyncPluginKey instances.
4. **Sidebar presence via REST polling** — Simpler than a separate WebSocket channel, 5s interval.
5. **Provider lifecycle in DocumentPage** — Created/destroyed per document navigation, passed as props.

## Files Added/Modified

- `apps/server/prisma/schema.prisma` — ydoc column, WorkspaceMember model
- `apps/server/src/ws/hocuspocus.ts` — WebSocket server (new)
- `apps/server/src/services/document.service.ts` — multi-workspace list, access checks
- `apps/server/src/routes/auth.ts` — `/auth/ws-token` endpoint
- `apps/server/prisma/seed.ts` — demo2 user + workspace membership
- `apps/web/components/editor/editor.tsx` — Collaboration + CollaborationCursor extensions
- `apps/web/components/editor/presence-bar.tsx` — awareness-based presence (new)
- `apps/web/components/editor/connection-status.tsx` — connection indicator (new)
- `apps/web/components/sidebar/document-tree.tsx` — presence dots
- `apps/web/app/(main)/documents/[documentId]/page.tsx` — HocuspocusProvider lifecycle
- `apps/web/next.config.ts` — y-prosemirror alias
- `apps/web/app/globals.css` — cursor styles
- `apps/web/hooks/use-auth.ts` — useWsToken hook
- `apps/web/lib/user-color.ts` — user color hashing (new)
- `e2e/collaboration.spec.ts` — collaboration E2E test (new)
