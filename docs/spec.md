# Kova — Product Spec

## Vision
A collaborative workspace where users create, organize, and edit documents in a Notion-like interface with AI assistance.

## Core Features (Phase 1)
1. **Authentication** — Register/login with email+password, JWT sessions
2. **Document CRUD** — Create, read, update, delete documents with nested tree structure
3. **Rich Text Editor** — Tiptap-based with slash commands and bubble toolbar
4. **Sidebar Navigation** — Collapsible sidebar with document tree
5. **Workspaces** — Auto-created on registration, scopes all documents

## Data Model
- User → Workspace (1:1 auto-created)
- Workspace → Documents (1:many)
- Document → Document (self-referencing parent/child for tree)

## API Endpoints
### Auth
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Documents
- GET /api/documents — list all in workspace
- POST /api/documents — create
- GET /api/documents/:id — get one
- PATCH /api/documents/:id — update
- DELETE /api/documents/:id — delete (cascade children)
