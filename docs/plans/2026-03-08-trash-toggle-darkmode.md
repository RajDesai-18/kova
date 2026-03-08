# Trash, Editable Toggle Title & Dark Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add document soft-delete with trash/restore, make toggle block titles editable, and default the app to dark mode.

**Architecture:** Soft-delete uses the existing `isArchived` column. New API routes for trash listing, restore, and permanent delete. Toggle title stored as a node attribute rendered via an editable `<span>`. Dark mode via `class="dark"` on `<html>` and replacing all hardcoded gray colors with semantic Tailwind tokens.

**Tech Stack:** Prisma, Express 5, React 19, Tiptap NodeView, Tailwind CSS v4

---

## Task 1: Backend — Soft-Delete & Trash API Routes

**Files:**
- Modify: `apps/server/src/services/document.service.ts`
- Modify: `apps/server/src/routes/documents.ts`

**Step 1: Change `delete` to soft-delete and add trash/restore/permanent-delete to DocumentService**

In `apps/server/src/services/document.service.ts`, replace the `delete` method and add three new methods:

```typescript
static async delete(id: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
  await this.verifyAccess(userId, doc.workspaceId);

  // Soft-delete: archive this doc and all its children recursively
  await prisma.document.updateMany({
    where: {
      OR: [{ id }, { parentId: id }],
      workspaceId: doc.workspaceId,
    },
    data: { isArchived: true },
  });
  return { success: true };
}

static async listTrash(userId: string) {
  const [owned, memberships] = await Promise.all([
    prisma.workspace.findUnique({ where: { userId }, select: { id: true } }),
    prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } }),
  ]);
  const uniqueIds = [...new Set([
    ...(owned ? [owned.id] : []),
    ...memberships.map((m) => m.workspaceId),
  ])];

  return prisma.document.findMany({
    where: { workspaceId: { in: uniqueIds }, isArchived: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, icon: true, parentId: true, updatedAt: true },
  });
}

static async restore(id: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
  await this.verifyAccess(userId, doc.workspaceId);

  // Restore this doc. If parent is also archived, move to root.
  const parentArchived = doc.parentId
    ? await prisma.document.findFirst({ where: { id: doc.parentId, isArchived: true } })
    : null;

  await prisma.document.update({
    where: { id },
    data: { isArchived: false, parentId: parentArchived ? null : doc.parentId },
  });
  return { success: true };
}

static async permanentDelete(id: string, userId: string) {
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) throw new AppError('DOCUMENT_NOT_FOUND', 'Document not found', 404);
  await this.verifyAccess(userId, doc.workspaceId);
  await prisma.document.delete({ where: { id } });
  return { success: true };
}
```

**Step 2: Add routes in `apps/server/src/routes/documents.ts`**

Add these three routes BEFORE the `/:id` routes (to avoid path conflicts):

```typescript
router.get('/trash', async (req: AuthRequest, res) => {
  try {
    const documents = await DocumentService.listTrash(req.userId!);
    res.json({ documents });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.post('/:id/restore', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await DocumentService.restore(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});

router.delete('/:id/permanent', async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await DocumentService.permanentDelete(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
});
```

**Step 3: Verify build**

Run: `cd apps/server && npx tsc --noEmit`

**Step 4: Commit**

```
feat(api): add soft-delete, trash listing, restore, and permanent delete
```

---

## Task 2: Frontend — Trash Hooks & Delete Button on Sidebar

**Files:**
- Modify: `apps/web/hooks/use-documents.ts`
- Modify: `apps/web/components/sidebar/document-tree.tsx`

**Step 1: Add hooks for trash, restore, permanent delete**

Append to `apps/web/hooks/use-documents.ts`:

```typescript
export function useTrash() {
  return useQuery({
    queryKey: ['documents', 'trash'],
    queryFn: () => api<{ documents: Document[] }>('/documents/trash').then((r) => r.documents),
  });
}

export function useRestoreDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/documents/${id}/restore`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function usePermanentDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/documents/${id}/permanent`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

**Step 2: Add delete (trash) button to DocumentItem in `document-tree.tsx`**

In the `DocumentItem` component, add `useDeleteDocument` and a trash button next to the existing "+" button. The trash button appears on hover:

```tsx
// Add import
import { useCreateDocument, useDeleteDocument } from '@/hooks/use-documents';

// Inside DocumentItem, add:
const deleteDoc = useDeleteDocument();

// After the existing "+" button, add:
<button
  onClick={(e) => {
    e.stopPropagation();
    deleteDoc.mutate(doc.id);
  }}
  className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted"
  title="Move to trash"
>
  <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
</button>
```

Also: if the deleted doc was the active one, redirect to `/` after delete.

**Step 3: Commit**

```
feat(web): add delete button to sidebar documents
```

---

## Task 3: Frontend — Trash Section in Sidebar

**Files:**
- Modify: `apps/web/components/sidebar/sidebar.tsx`

**Step 1: Add Trash section to sidebar**

Below the Documents tree, add a Trash section with expand/collapse:

```tsx
import { useTrash, useRestoreDocument, usePermanentDeleteDocument } from '@/hooks/use-documents';

// Inside Sidebar component:
const { data: trash } = useTrash();
const [trashOpen, setTrashOpen] = useState(false);
const restoreDoc = useRestoreDocument();
const permanentDelete = usePermanentDeleteDocument();

// After the DocumentTree div, before </motion.aside>:
<div className="border-t border-border p-2">
  <button
    onClick={() => setTrashOpen(!trashOpen)}
    className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
  >
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
    <span>Trash</span>
    {trash && trash.length > 0 && (
      <span className="ml-auto text-xs text-muted-foreground">{trash.length}</span>
    )}
  </button>
  {trashOpen && trash && trash.length > 0 && (
    <div className="mt-1 space-y-0.5">
      {trash.map((doc) => (
        <div key={doc.id} className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground">
          <span className="truncate flex-1">{doc.icon || ''} {doc.title || 'Untitled'}</span>
          <button
            onClick={() => restoreDoc.mutate(doc.id)}
            className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted"
            title="Restore"
          >
            {/* Undo icon */}
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
            </svg>
          </button>
          <button
            onClick={() => permanentDelete.mutate(doc.id)}
            className="shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-muted text-destructive"
            title="Delete forever"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

**Step 2: Commit**

```
feat(web): add trash section with restore and permanent delete
```

---

## Task 4: Editable Toggle Title

**Files:**
- Modify: `apps/web/components/editor/extensions/toggle.ts`
- Modify: `apps/web/app/globals.css`

**Step 1: Add `title` attribute and make it editable in NodeView**

In `toggle.ts`, add a `title` attribute (default `"Toggle"`) and change the NodeView summary to use an editable `<span>` for the title text:

```typescript
addAttributes() {
  return {
    open: {
      default: true,
      parseHTML: (element: HTMLElement) => element.getAttribute('data-open') !== 'false',
      renderHTML: (attributes: Record<string, unknown>) => ({
        'data-open': attributes.open ? 'true' : 'false',
      }),
    },
    title: {
      default: 'Toggle',
      parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || 'Toggle',
      renderHTML: (attributes: Record<string, unknown>) => ({
        'data-title': attributes.title as string,
      }),
    },
  };
},
```

In the NodeView, replace the summary construction:

```typescript
let currentTitle = node.attrs.title as string;

const summary = document.createElement('div');
summary.classList.add('toggle-summary');

const arrow = document.createElement('span');
arrow.classList.add('toggle-arrow');
arrow.textContent = isOpen ? '▼' : '▶';
arrow.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const pos = typeof getPos === 'function' ? getPos() : null;
  if (pos == null) return;
  editor.chain().focus().command(({ tr }) => {
    tr.setNodeAttribute(pos, 'open', !isOpen);
    return true;
  }).run();
});

const titleEl = document.createElement('span');
titleEl.classList.add('toggle-title');
titleEl.setAttribute('contenteditable', 'true');
titleEl.textContent = currentTitle;
titleEl.addEventListener('input', () => {
  const pos = typeof getPos === 'function' ? getPos() : null;
  if (pos == null) return;
  currentTitle = titleEl.textContent || 'Toggle';
  editor.chain().command(({ tr }) => {
    tr.setNodeAttribute(pos, 'title', currentTitle);
    return true;
  }).run();
});
titleEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    editor.commands.focus();
  }
});

summary.append(arrow, titleEl);
```

Update the `update` method:

```typescript
update(updatedNode) {
  if (updatedNode.type.name !== 'toggle') return false;
  isOpen = updatedNode.attrs.open as boolean;
  currentTitle = updatedNode.attrs.title as string;
  content.style.display = isOpen ? '' : 'none';
  arrow.textContent = isOpen ? '▼' : '▶';
  if (titleEl.textContent !== currentTitle) {
    titleEl.textContent = currentTitle;
  }
  return true;
},
```

**Step 2: Add CSS for `.toggle-title` in `globals.css`**

```css
.ProseMirror .toggle-title {
  outline: none;
  flex: 1;
  min-width: 0;
}
```

**Step 3: Commit**

```
feat(editor): make toggle block title editable
```

---

## Task 5: Dark Mode — Root Layout + CSS Fixes

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/globals.css`

**Step 1: Add `dark` class to `<html>` in root layout**

In `apps/web/app/layout.tsx`, change:

```tsx
<html lang="en" className={cn("font-sans", geist.variable)}>
```

to:

```tsx
<html lang="en" className={cn("dark font-sans", geist.variable)}>
```

**Step 2: Fix hardcoded colors in globals.css**

Replace hardcoded `#F5F5F5` backgrounds with CSS variable references:

- `.ProseMirror .callout-block` `background-color: #F5F5F5` → `background-color: var(--muted)`
- `.ProseMirror table th` `background-color: #F5F5F5` → `background-color: var(--muted)`
- `.ProseMirror table td.selectedCell` `background-color: #EEF2FF` → `background-color: var(--accent)`

Also fix the default text color swatch in bubble-toolbar (line 214): `#171717` → `currentColor` approach.

**Step 3: Commit**

```
feat(web): enable dark mode by default
```

---

## Task 6: Dark Mode — Replace Hardcoded Grays in Components

**Files:**
- Modify: `apps/web/components/editor/bubble-toolbar.tsx`
- Modify: `apps/web/components/editor/slash-command.tsx`
- Modify: `apps/web/components/editor/emoji-picker.tsx`
- Modify: `apps/web/components/sidebar/document-tree.tsx`
- Modify: `apps/web/app/(main)/documents/[documentId]/page.tsx`

**Step 1: Replace all hardcoded gray classes**

All replacements use semantic Tailwind tokens:

| File | Old | New |
|------|-----|-----|
| `bubble-toolbar.tsx` | `hover:bg-gray-100` | `hover:bg-muted` |
| `bubble-toolbar.tsx` | `bg-gray-100` | `bg-muted` |
| `slash-command.tsx` | `bg-gray-100` | `bg-muted` |
| `slash-command.tsx` | `hover:bg-gray-50` | `hover:bg-muted/50` |
| `emoji-picker.tsx` | `hover:bg-gray-100` | `hover:bg-muted` |
| `emoji-picker.tsx` | `hover:bg-gray-50` | `hover:bg-muted/50` |
| `document-tree.tsx` | `hover:bg-gray-100` | `hover:bg-muted` |
| `document-tree.tsx` | `hover:bg-gray-200` | `hover:bg-muted` |
| `page.tsx` ([documentId]) | `placeholder:text-gray-300` | `placeholder:text-muted-foreground/50` |

**Step 2: Commit**

```
feat(web): replace hardcoded grays with semantic dark-mode tokens
```

---

## Task 7: Build Verification

**Step 1:** Run `npm run build` from repo root — should compile cleanly.

**Step 2:** Manual verification checklist:
- Dark mode visible on all pages
- Sidebar shows delete button on hover
- Deleting a doc moves it to trash (sidebar bottom)
- Trash section shows archived docs with restore/delete buttons
- Restore puts doc back in sidebar
- Permanent delete removes it
- Toggle block title is editable inline
- All existing features still work

**Step 3: Final commit if any fixups needed**

---

## Execution Order

1. Task 1 → Backend API (no frontend deps)
2. Task 2 → Frontend hooks + delete button (depends on Task 1)
3. Task 3 → Trash sidebar UI (depends on Task 2)
4. Task 4 → Editable toggle (independent)
5. Task 5 → Dark mode layout + CSS (independent)
6. Task 6 → Dark mode component fixes (depends on Task 5)
7. Task 7 → Build verification (depends on all)

Tasks 4, 5 can run in parallel with Tasks 2, 3.
