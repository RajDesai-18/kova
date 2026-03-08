# Editor Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the Tiptap editor with Notion-like formatting: slash commands (13 items), rich inline toolbar (9 buttons), emoji picker, markdown shortcuts, and custom block types (toggle, callout).

**Architecture:** Install Tiptap extensions for new marks/nodes (underline, color, highlight, task list, table), build 2 custom extensions (Toggle, Callout), rewrite slash-command and bubble-toolbar components, add emoji-mart picker on document page. All editor extensions registered in `editor.tsx`.

**Tech Stack:** Tiptap 3.x extensions, emoji-mart, ProseMirror input rules, React 19

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install Tiptap extensions + emoji-mart**

```bash
cd D:/HOME/Projects/kova
npm install --workspace=apps/web @tiptap/extension-underline @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight @tiptap/extension-task-list @tiptap/extension-task-item @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell @emoji-mart/data @emoji-mart/react
```

**Step 2: Verify installation**

Run: `cat apps/web/package.json | grep -E "(underline|color|text-style|highlight|task-list|task-item|table|emoji-mart)"`
Expected: All 12 packages listed in dependencies.

**Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "feat(editor): install tiptap extensions and emoji-mart"
```

---

### Task 2: Custom Toggle Extension

**Files:**
- Create: `apps/web/components/editor/extensions/toggle.ts`

**Step 1: Create the Toggle extension**

This is a `<details>/<summary>` block node for collapsible content.

```typescript
import { Node, mergeAttributes } from '@tiptap/core';

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (element) => element.hasAttribute('open'),
        renderHTML: (attributes) => (attributes.open ? { open: '' } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'details' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'details',
      mergeAttributes(HTMLAttributes, { class: 'toggle-block' }),
      ['summary', { class: 'toggle-summary' }, 'Toggle'],
      ['div', { class: 'toggle-content' }, 0],
    ];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            content: [{ type: 'paragraph' }],
          });
        },
    } as any;
  },
});
```

**Step 2: Commit**

```bash
git add apps/web/components/editor/extensions/toggle.ts
git commit -m "feat(editor): add custom Toggle extension (details/summary)"
```

---

### Task 3: Custom Callout Extension

**Files:**
- Create: `apps/web/components/editor/extensions/callout.ts`

**Step 1: Create the Callout extension**

A colored box with an emoji prefix (like Notion callouts).

```typescript
import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      emoji: {
        default: '💡',
        parseHTML: (element) => element.getAttribute('data-emoji') || '💡',
        renderHTML: (attributes) => ({ 'data-emoji': attributes.emoji }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'callout',
        class: 'callout-block',
      }),
      ['span', { class: 'callout-emoji', contenteditable: 'false' }, HTMLAttributes['data-emoji'] || '💡'],
      ['div', { class: 'callout-content' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs?: { emoji?: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { emoji: attrs?.emoji || '💡' },
            content: [{ type: 'paragraph' }],
          });
        },
    } as any;
  },
});
```

**Step 2: Commit**

```bash
git add apps/web/components/editor/extensions/callout.ts
git commit -m "feat(editor): add custom Callout extension"
```

---

### Task 4: Update Editor with All Extensions

**Files:**
- Modify: `apps/web/components/editor/editor.tsx`

**Step 1: Register all new extensions**

Replace the entire `editor.tsx` with:

```typescript
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { useEffect, useRef } from 'react';
import { BubbleToolbar } from './bubble-toolbar';
import { SlashCommand } from './slash-command';
import { Toggle } from './extensions/toggle';
import { Callout } from './extensions/callout';

interface EditorProps {
  content: unknown;
  onUpdate: (content: unknown) => void;
  editable?: boolean;
}

export function Editor({ content, onUpdate, editable = true }: EditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-accent underline cursor-pointer',
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Toggle,
      Callout,
    ],
    content: content as string,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(editor.getJSON());
      }, 500);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="relative">
      <BubbleToolbar editor={editor} containerRef={containerRef} />
      <SlashCommand editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd D:/HOME/Projects/kova && npm run build --workspace=apps/web`
Expected: Clean build with no errors.

**Step 3: Commit**

```bash
git add apps/web/components/editor/editor.tsx
git commit -m "feat(editor): register all tiptap extensions (underline, color, highlight, tasks, table, toggle, callout)"
```

---

### Task 5: Rewrite Slash Command Menu

**Files:**
- Modify: `apps/web/components/editor/slash-command.tsx`

**Step 1: Rewrite with 13 commands and improved positioning**

Replace the entire file with:

```typescript
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface SlashCommandProps {
  editor: Editor;
}

interface Command {
  label: string;
  description: string;
  icon: string;
  action: (editor: Editor) => void;
}

const COMMANDS: Command[] = [
  { label: 'Heading 1', description: 'Large heading', icon: 'H1', action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', description: 'Medium heading', icon: 'H2', action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', description: 'Small heading', icon: 'H3', action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', description: 'Unordered list', icon: '•', action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List', description: 'Ordered list', icon: '1.', action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'To-do List', description: 'Checkbox items', icon: '☑', action: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Toggle List', description: 'Collapsible content', icon: '▶', action: (e) => (e.commands as any).setToggle() },
  { label: 'Callout', description: 'Highlighted box', icon: '💡', action: (e) => (e.commands as any).setCallout() },
  { label: 'Code Block', description: 'Code snippet', icon: '</>', action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Blockquote', description: 'Quote block', icon: '"', action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Divider', description: 'Horizontal rule', icon: '—', action: (e) => e.chain().focus().setHorizontalRule().run() },
  { label: 'Table', description: '3×3 table', icon: '⊞', action: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
];

export function SlashCommand({ editor }: SlashCommandProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(filter.toLowerCase()) ||
      cmd.description.toLowerCase().includes(filter.toLowerCase()),
  );

  const executeCommand = useCallback(
    (cmd: Command) => {
      const { from } = editor.state.selection;
      editor.chain().focus().deleteRange({ from: from - 1 - filter.length, to: from }).run();
      cmd.action(editor);
      setOpen(false);
    },
    [editor, filter],
  );

  const updatePosition = useCallback(() => {
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const editorRect = editor.view.dom.getBoundingClientRect();
    setPosition({
      top: coords.bottom - editorRect.top + 4,
      left: coords.left - editorRect.left,
    });
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === '/' && !open) {
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
        if (textBefore === '' || textBefore === '\n' || from === 1) {
          setOpen(true);
          setFilter('');
          setSelectedIndex(0);
          setTimeout(updatePosition, 0);
        }
      }

      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }

      if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        executeCommand(filtered[selectedIndex]);
      }

      if (e.key === 'Backspace' && filter === '') {
        setOpen(false);
      }

      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        setFilter((f) => f + e.key);
        setSelectedIndex(0);
      }

      if (e.key === 'Backspace' && filter.length > 0) {
        setFilter((f) => f.slice(0, -1));
        setSelectedIndex(0);
      }
    },
    [open, filter, filtered, selectedIndex, editor, executeCommand, updatePosition],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 rounded-lg border border-border bg-surface py-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === selectedIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            executeCommand(cmd);
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm">
            {cmd.icon}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{cmd.label}</span>
            <span className="text-xs text-muted">{cmd.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/editor/slash-command.tsx
git commit -m "feat(editor): rewrite slash command menu with 13 commands and positioning"
```

---

### Task 6: Rewrite Inline Toolbar (Bubble Toolbar)

**Files:**
- Modify: `apps/web/components/editor/bubble-toolbar.tsx`

**Step 1: Rewrite with 9 buttons including color, link, highlight**

Replace the entire file with:

```typescript
'use client';

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';

interface BubbleToolbarProps {
  editor: Editor;
  containerRef: RefObject<HTMLDivElement | null>;
}

const TEXT_COLORS = [
  { label: 'Default', value: '' },
  { label: 'Red', value: '#DC2626' },
  { label: 'Orange', value: '#EA580C' },
  { label: 'Yellow', value: '#CA8A04' },
  { label: 'Green', value: '#16A34A' },
  { label: 'Blue', value: '#2563EB' },
  { label: 'Purple', value: '#9333EA' },
  { label: 'Gray', value: '#6B7280' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', value: '' },
  { label: 'Yellow', value: '#FEF08A' },
  { label: 'Green', value: '#BBF7D0' },
  { label: 'Blue', value: '#BFDBFE' },
  { label: 'Purple', value: '#E9D5FF' },
  { label: 'Pink', value: '#FBCFE8' },
  { label: 'Red', value: '#FECACA' },
  { label: 'Orange', value: '#FED7AA' },
];

export function BubbleToolbar({ editor, containerRef }: BubbleToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      setVisible(false);
      return;
    }

    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    setPosition({
      top: start.top - containerRect.top - 48,
      left: (start.left + end.left) / 2 - containerRect.left,
    });
    setVisible(true);
  }, [editor, containerRef]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', ({ event }) => {
      // Don't hide if clicking inside toolbar
      const relatedTarget = (event as FocusEvent)?.relatedTarget as Node | null;
      if (toolbarRef.current?.contains(relatedTarget)) return;
      setTimeout(() => setVisible(false), 150);
    });
    return () => {
      editor.off('selectionUpdate', updatePosition);
    };
  }, [editor, updatePosition]);

  const closePickers = () => {
    setShowColorPicker(false);
    setShowHighlightPicker(false);
    setShowLinkInput(false);
  };

  const handleLink = () => {
    if (showLinkInput) {
      if (linkUrl) {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      } else {
        editor.chain().focus().unsetLink().run();
      }
      setShowLinkInput(false);
      setLinkUrl('');
    } else {
      closePickers();
      const existingHref = editor.getAttributes('link').href || '';
      setLinkUrl(existingHref);
      setShowLinkInput(true);
      setTimeout(() => linkInputRef.current?.focus(), 0);
    }
  };

  if (!visible) return null;

  const btnClass = (active: boolean, extra = '') =>
    `rounded-md px-2 py-1 text-sm transition-colors hover:bg-gray-100 ${
      active ? 'bg-gray-100 text-accent' : 'text-foreground'
    } ${extra}`;

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-lg"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
    >
      {/* Bold */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={btnClass(editor.isActive('bold'), 'font-bold')}
      >B</button>

      {/* Italic */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={btnClass(editor.isActive('italic'), 'italic')}
      >I</button>

      {/* Underline */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
        className={btnClass(editor.isActive('underline'), 'underline')}
      >U</button>

      {/* Strikethrough */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
        className={btnClass(editor.isActive('strike'), 'line-through')}
      >S</button>

      {/* Code */}
      <button
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
        className={btnClass(editor.isActive('code'), 'font-mono text-xs')}
      >{'<>'}</button>

      {/* Separator */}
      <div className="mx-0.5 h-5 w-px bg-border" />

      {/* Link */}
      <div className="relative">
        <button
          onMouseDown={(e) => { e.preventDefault(); handleLink(); }}
          className={btnClass(editor.isActive('link'))}
        >🔗</button>
        {showLinkInput && (
          <div className="absolute left-0 top-full mt-1 flex gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-lg">
            <input
              ref={linkInputRef}
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleLink(); }
                if (e.key === 'Escape') setShowLinkInput(false);
              }}
              placeholder="Paste link..."
              className="w-48 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Text Color */}
      <div className="relative">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setShowHighlightPicker(false);
            setShowLinkInput(false);
            setShowColorPicker(!showColorPicker);
          }}
          className={btnClass(false)}
          title="Text color"
        >A<span className="ml-0.5 inline-block h-0.5 w-3 rounded" style={{ backgroundColor: editor.getAttributes('textStyle').color || '#171717' }} /></button>
        {showColorPicker && (
          <div className="absolute left-0 top-full mt-1 grid grid-cols-4 gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (c.value) {
                    editor.chain().focus().setColor(c.value).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                  setShowColorPicker(false);
                }}
                className="h-6 w-6 rounded border border-border"
                style={{ backgroundColor: c.value || '#171717' }}
                title={c.label}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight */}
      <div className="relative">
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setShowColorPicker(false);
            setShowLinkInput(false);
            setShowHighlightPicker(!showHighlightPicker);
          }}
          className={btnClass(editor.isActive('highlight'))}
          title="Highlight"
        >
          <span className="rounded bg-yellow-200 px-0.5">H</span>
        </button>
        {showHighlightPicker && (
          <div className="absolute right-0 top-full mt-1 grid grid-cols-4 gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (c.value) {
                    editor.chain().focus().toggleHighlight({ color: c.value }).run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                  setShowHighlightPicker(false);
                }}
                className="h-6 w-6 rounded border border-border"
                style={{ backgroundColor: c.value || '#FFFFFF' }}
                title={c.label}
              />
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="mx-0.5 h-5 w-px bg-border" />

      {/* Comment placeholder */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        className={btnClass(false)}
        title="Comment (coming soon)"
        disabled
      >💬</button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/components/editor/bubble-toolbar.tsx
git commit -m "feat(editor): rewrite inline toolbar with underline, link, color, highlight, comment"
```

---

### Task 7: Emoji Picker on Document Page

**Files:**
- Create: `apps/web/components/editor/emoji-picker.tsx`
- Modify: `apps/web/app/(main)/documents/[documentId]/page.tsx`

**Step 1: Create EmojiPicker component**

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  currentEmoji: string | null;
  onSelect: (emoji: string) => void;
  onRemove: () => void;
}

export function EmojiPicker({ currentEmoji, onSelect, onRemove }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-1 text-2xl hover:bg-gray-100"
        title="Set document icon"
      >
        {currentEmoji || '📄'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1">
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              onSelect(emoji.native);
              setOpen(false);
            }}
            theme="light"
            previewPosition="none"
            skinTonePosition="none"
          />
          {currentEmoji && (
            <button
              onClick={() => { onRemove(); setOpen(false); }}
              className="w-full rounded-b-lg border border-t-0 border-border bg-surface px-3 py-2 text-sm text-muted hover:bg-gray-50"
            >
              Remove icon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update document page to include emoji picker and title Enter→focus**

Replace `apps/web/app/(main)/documents/[documentId]/page.tsx`:

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useDocument, useUpdateDocument } from '@/hooks/use-documents';
import { Editor } from '@/components/editor';
import { EmojiPicker } from '@/components/editor/emoji-picker';
import { Skeleton } from '@/components/ui/skeleton';

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const { data: doc, isLoading } = useDocument(documentId);
  const updateDoc = useUpdateDocument();
  const [title, setTitle] = useState('');
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const editorWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (doc) setTitle(doc.title);
  }, [doc]);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      updateDoc.mutate({ id: documentId, title: newTitle });
    }, 500);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Focus the editor
      const proseMirror = editorWrapperRef.current?.querySelector('.ProseMirror') as HTMLElement;
      proseMirror?.focus();
    }
  };

  const handleContentUpdate = (content: unknown) => {
    updateDoc.mutate({ id: documentId, content });
  };

  const handleEmojiSelect = (emoji: string) => {
    updateDoc.mutate({ id: documentId, icon: emoji });
  };

  const handleEmojiRemove = () => {
    updateDoc.mutate({ id: documentId, icon: null });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 py-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="mb-4 flex items-center gap-2">
        <EmojiPicker
          currentEmoji={doc.icon}
          onSelect={handleEmojiSelect}
          onRemove={handleEmojiRemove}
        />
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          className="w-full border-none bg-transparent text-4xl font-bold text-foreground placeholder:text-gray-300 focus:outline-none"
        />
      </div>
      <div ref={editorWrapperRef}>
        <Editor content={doc.content} onUpdate={handleContentUpdate} />
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/components/editor/emoji-picker.tsx apps/web/app/\(main\)/documents/\[documentId\]/page.tsx
git commit -m "feat(editor): add emoji picker for document icons and title Enter→focus"
```

---

### Task 8: CSS for New Block Types

**Files:**
- Modify: `apps/web/app/globals.css`

**Step 1: Add styles for toggle, callout, task list, and table**

Append to `globals.css`:

```css
/* Editor block styles */
.ProseMirror .toggle-block {
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  padding: 0.5rem;
  margin: 0.5rem 0;
}

.ProseMirror .toggle-summary {
  cursor: pointer;
  font-weight: 500;
  user-select: none;
}

.ProseMirror .toggle-content {
  padding-top: 0.25rem;
}

.ProseMirror .callout-block {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  margin: 0.5rem 0;
  border-radius: 0.375rem;
  background-color: #F5F5F5;
  border-left: 3px solid var(--color-accent);
}

.ProseMirror .callout-emoji {
  font-size: 1.25rem;
  line-height: 1.5;
  flex-shrink: 0;
}

.ProseMirror .callout-content {
  flex: 1;
  min-width: 0;
}

.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.ProseMirror ul[data-type="taskList"] li > label {
  margin-top: 0.25rem;
}

.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
  cursor: pointer;
  accent-color: var(--color-accent);
}

.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through;
  color: var(--color-muted);
}

.ProseMirror table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5rem 0;
}

.ProseMirror table th,
.ProseMirror table td {
  border: 1px solid var(--color-border);
  padding: 0.375rem 0.75rem;
  text-align: left;
  vertical-align: top;
}

.ProseMirror table th {
  background-color: #F5F5F5;
  font-weight: 600;
}

.ProseMirror table td.selectedCell,
.ProseMirror table th.selectedCell {
  background-color: #EEF2FF;
}
```

**Step 2: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat(editor): add CSS for toggle, callout, task list, and table blocks"
```

---

### Task 9: Build and Verify

**Step 1: Run build**

```bash
cd D:/HOME/Projects/kova && npm run build
```

Expected: Clean build across all workspaces.

**Step 2: Fix any TypeScript errors**

Address any type errors from new extensions.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(editor): resolve build issues from editor upgrade"
```

---

### Task 10: Manual Smoke Test

**Step 1: Start dev server**

```bash
cd D:/HOME/Projects/kova && npm run dev
```

**Step 2: Verify these features work**

1. Open a document — editor loads with placeholder text
2. Type `/` — slash command menu appears with 12 commands
3. Select "To-do List" — checkbox item appears
4. Select text — inline toolbar appears with B/I/U/S/Code/Link/Color/Highlight/Comment
5. Click color button — color picker shows 8 colors
6. Click highlight — highlight picker shows 8 colors
7. Click link — URL input appears
8. Click emoji icon on document page — emoji picker opens
9. Select an emoji — document icon updates
10. Press Enter in title — editor gains focus

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(editor): complete Notion-like editor upgrade

- 12-command slash menu (headings, lists, to-do, toggle, callout, code, blockquote, divider, table)
- Rich inline toolbar (bold, italic, underline, strike, code, link, text color, highlight, comment placeholder)
- Full emoji picker for document icons (emoji-mart)
- Custom Toggle and Callout Tiptap extensions
- Task list with checkboxes
- Table support with header row
- Title Enter key focuses editor
- CSS styles for all new block types"
```
