'use client';

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Editor } from '@tiptap/react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

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
  { label: 'Small Text', description: 'Font size 14px', icon: 'A-', action: (e) => (e.commands as any).setFontSize('14px') },
  { label: 'Large Text', description: 'Font size 20px', icon: 'A+', action: (e) => (e.commands as any).setFontSize('20px') },
  { label: 'Huge Text', description: 'Font size 24px', icon: 'A++', action: (e) => (e.commands as any).setFontSize('24px') },
  { label: 'Align Left', description: 'Left-align text', icon: '⫷', action: (e) => e.chain().focus().setTextAlign('left').run() },
  { label: 'Align Center', description: 'Center-align text', icon: '⫸', action: (e) => e.chain().focus().setTextAlign('center').run() },
  { label: 'Align Right', description: 'Right-align text', icon: '⫹', action: (e) => e.chain().focus().setTextAlign('right').run() },
];

export interface SlashCommandRef {
  onStart: (props: SuggestionProps<Command>) => void;
  onUpdate: (props: SuggestionProps<Command>) => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  onExit: () => void;
}

export const SlashCommand = forwardRef<SlashCommandRef>(function SlashCommand(_props, ref) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const commandFnRef = useRef<((props: { action: (editor: Editor) => void }) => void) | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase()),
  );

  const updatePositionFromRect = useCallback((clientRect: (() => DOMRect | null) | null | undefined) => {
    if (!clientRect) return;
    const rect = clientRect();
    if (!rect) return;
    // Position relative to viewport — the menu is in a relative container
    const editorEl = document.querySelector('.ProseMirror');
    if (!editorEl) return;
    const editorRect = editorEl.getBoundingClientRect();
    setPosition({
      top: rect.bottom - editorRect.top + 4,
      left: rect.left - editorRect.left,
    });
  }, []);

  useImperativeHandle(ref, () => ({
    onStart(props) {
      setOpen(true);
      setQuery(props.query);
      setSelectedIndex(0);
      commandFnRef.current = props.command;
      updatePositionFromRect(props.clientRect);
    },
    onUpdate(props) {
      setQuery(props.query);
      commandFnRef.current = props.command;
      updatePositionFromRect(props.clientRect);
    },
    onKeyDown({ event }) {
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return true;
      }
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return true;
      }
      if (event.key === 'Enter') {
        const cmd = filtered[selectedIndex];
        if (cmd && commandFnRef.current) {
          commandFnRef.current({ action: cmd.action });
        }
        return true;
      }
      if (event.key === 'Escape') {
        setOpen(false);
        return true;
      }
      return false;
    },
    onExit() {
      setOpen(false);
    },
  }));

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-72 rounded-lg border border-border bg-card py-1 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.label}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            if (commandFnRef.current) {
              commandFnRef.current({ action: cmd.action });
            }
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm">
            {cmd.icon}
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{cmd.label}</span>
            <span className="text-xs text-muted-foreground">{cmd.description}</span>
          </div>
        </button>
      ))}
    </div>
  );
});
