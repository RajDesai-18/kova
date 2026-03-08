# Editor Upgrade Design — Notion-like Formatting

**Date:** 2026-03-07
**Status:** Approved

## Scope

Upgrade Tiptap editor with rich formatting, slash commands, inline toolbar, emoji picker, and markdown shortcuts. Drag handles deferred to later phase.

## Architecture

### New Tiptap Extensions (install)
- `@tiptap/extension-underline` — underline formatting
- `@tiptap/extension-color` + `@tiptap/extension-text-style` — text color
- `@tiptap/extension-highlight` — background highlight
- `@tiptap/extension-task-list` + `@tiptap/extension-task-item` — to-do checkboxes
- `@tiptap/extension-table` + `@tiptap/extension-table-row` + `@tiptap/extension-table-header` + `@tiptap/extension-table-cell` — simple tables

### Custom Tiptap Extensions (build)
1. **Toggle** — `<details>/<summary>` node, slash command "Toggle list"
2. **Callout** — colored box with emoji prefix, slash command "Callout"

### New Components
- `emoji-mart` (`@emoji-mart/data` + `@emoji-mart/react`) — full emoji picker on document page

## Slash Command Menu

13 commands triggered by typing `/` at start of empty block:

| Command | Action |
|---------|--------|
| Heading 1 | `setNode('heading', { level: 1 })` |
| Heading 2 | `setNode('heading', { level: 2 })` |
| Heading 3 | `setNode('heading', { level: 3 })` |
| Bullet List | `toggleBulletList()` |
| Numbered List | `toggleOrderedList()` |
| To-do List | `toggleTaskList()` |
| Toggle List | Insert toggle node |
| Callout | Insert callout node |
| Code Block | `toggleCodeBlock()` |
| Blockquote | `toggleBlockquote()` |
| Divider | `setHorizontalRule()` |
| Table | Insert 3×3 table |
| Emoji | Open emoji picker inline |

Behavior: filterable list, keyboard nav (↑/↓/Enter/Esc), closes on selection or click-outside.

## Inline Toolbar (Bubble Menu)

Appears on text selection with 9 buttons:

1. **Bold** / **Italic** / **Underline** / **Strikethrough** / **Code** — toggle marks
2. **Link** — input popover for URL
3. **Text Color** — color picker dropdown
4. **Highlight** — highlight color picker dropdown
5. **Comment** — placeholder button (future feature)

## Emoji Picker

- Full `emoji-mart` picker on document page (icon button near title)
- Sets document icon via existing `icon` field on document model

## Additional Changes

- **Title Enter key**: pressing Enter in title input focuses editor
- **Markdown shortcuts**: `[] ` → to-do item (TaskList inputRule)
- **CSS**: styles for toggle, callout, task list, table block types

## Out of Scope

- Drag handles (deferred)
- AI features
- Real-time collaboration
