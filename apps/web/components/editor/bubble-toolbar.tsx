'use client';

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  ListChecks,
  Superscript,
  Subscript,
  ChevronDown,
} from 'lucide-react';

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

const FONT_SIZES = [
  { label: 'Small', value: '14px' },
  { label: 'Normal', value: '' },
  { label: 'Large', value: '20px' },
  { label: 'Huge', value: '24px' },
];

const BLOCK_TYPES = [
  { label: 'Paragraph', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];

type PickerType = 'color' | 'highlight' | 'link' | 'fontSize' | 'heading' | null;

export function BubbleToolbar({ editor, containerRef }: BubbleToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activePicker, setActivePicker] = useState<PickerType>(null);
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

    const toolbarWidth = toolbarRef.current?.offsetWidth || 400;
    const rawLeft = (start.left + end.left) / 2 - containerRect.left;
    const minLeft = toolbarWidth / 2;
    const maxLeft = containerRect.width - toolbarWidth / 2;
    const clampedLeft = Math.max(minLeft, Math.min(rawLeft, maxLeft));

    setPosition({
      top: start.top - containerRect.top - 90,
      left: clampedLeft,
    });
    setVisible(true);
  }, [editor, containerRef]);

  useEffect(() => {
    editor.on('selectionUpdate', updatePosition);
    editor.on('blur', ({ event }) => {
      const relatedTarget = (event as FocusEvent)?.relatedTarget as Node | null;
      if (toolbarRef.current?.contains(relatedTarget)) return;
      setTimeout(() => setVisible(false), 150);
    });
    return () => {
      editor.off('selectionUpdate', updatePosition);
    };
  }, [editor, updatePosition]);

  const togglePicker = (picker: PickerType) => {
    if (activePicker === picker) {
      setActivePicker(null);
    } else {
      setActivePicker(picker);
      if (picker === 'link') {
        const existingHref = editor.getAttributes('link').href || '';
        setLinkUrl(existingHref);
        setTimeout(() => linkInputRef.current?.focus(), 0);
      }
    }
  };

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setActivePicker(null);
    setLinkUrl('');
  };

  const getCurrentBlockType = (): string => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    return 'P';
  };

  const getCurrentFontSize = (): string => {
    const fs = editor.getAttributes('textStyle').fontSize;
    if (!fs) return 'Normal';
    const match = FONT_SIZES.find((s) => s.value === fs);
    return match?.label || 'Normal';
  };

  if (!visible) return null;

  const btnClass = (active: boolean, extra = '') =>
    `rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted ${
      active ? 'bg-muted text-primary' : 'text-foreground'
    } ${extra}`;

  const iconBtnClass = (active: boolean) =>
    `flex items-center justify-center rounded-md p-1.5 transition-colors hover:bg-muted ${
      active ? 'bg-muted text-primary' : 'text-foreground'
    }`;

  const separator = <div className="mx-0.5 h-5 w-px bg-border" />;

  // Dropdown panel styles — positioned below the toolbar
  const dropdownClass = 'absolute left-0 top-full mt-1 z-50 rounded-lg border border-border bg-card p-2 shadow-lg';

  return (
    <div
      ref={toolbarRef}
      className="absolute z-50 rounded-lg border border-border bg-card p-1 shadow-lg"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
    >
      {/* Row 1: Inline marks + Link */}
      <div className="flex items-center gap-0.5">
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={btnClass(editor.isActive('bold'), 'font-bold')}
        >B</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={btnClass(editor.isActive('italic'), 'italic')}
        >I</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={btnClass(editor.isActive('underline'), 'underline')}
        >U</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          className={btnClass(editor.isActive('strike'), 'line-through')}
        >S</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleSuperscript().run(); }}
          className={iconBtnClass(editor.isActive('superscript'))}
          title="Superscript"
        ><Superscript size={14} /></button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleSubscript().run(); }}
          className={iconBtnClass(editor.isActive('subscript'))}
          title="Subscript"
        ><Subscript size={14} /></button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
          className={btnClass(editor.isActive('code'), 'font-mono text-xs')}
        >{'<>'}</button>

        {separator}

        {/* Link */}
        <button
          onMouseDown={(e) => { e.preventDefault(); togglePicker('link'); }}
          className={btnClass(editor.isActive('link'))}
        >🔗</button>

        {separator}

        {/* Text Color */}
        <button
          onMouseDown={(e) => { e.preventDefault(); togglePicker('color'); }}
          className={btnClass(false)}
          title="Text color"
        >
          A<span className="ml-0.5 inline-block h-0.5 w-3 rounded" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'var(--foreground)' }} />
        </button>

        {/* Highlight */}
        <button
          onMouseDown={(e) => { e.preventDefault(); togglePicker('highlight'); }}
          className={btnClass(editor.isActive('highlight'))}
          title="Highlight"
        >
          <span className="rounded bg-yellow-200 px-0.5">H</span>
        </button>
      </div>

      {/* Row 2: Block type + Font size + Lists + Alignment */}
      <div className="mt-1 flex items-center gap-0.5 border-t border-border pt-1">
        {/* Block Type Dropdown */}
        <button
          onMouseDown={(e) => { e.preventDefault(); togglePicker('heading'); }}
          className={`${btnClass(false)} flex items-center gap-0.5`}
          title="Block type"
        >
          <span className="min-w-[1.5rem] text-center">{getCurrentBlockType()}</span>
          <ChevronDown size={12} />
        </button>

        {/* Font Size Dropdown */}
        <button
          onMouseDown={(e) => { e.preventDefault(); togglePicker('fontSize'); }}
          className={`${btnClass(false)} flex items-center gap-0.5`}
          title="Font size"
        >
          <span className="min-w-[2.5rem] text-center text-xs">{getCurrentFontSize()}</span>
          <ChevronDown size={12} />
        </button>

        {separator}

        {/* Lists */}
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={iconBtnClass(editor.isActive('bulletList'))}
          title="Bullet list"
        ><List size={14} /></button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={iconBtnClass(editor.isActive('orderedList'))}
          title="Numbered list"
        ><ListOrdered size={14} /></button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleTaskList().run(); }}
          className={iconBtnClass(editor.isActive('taskList'))}
          title="Checklist"
        ><ListChecks size={14} /></button>

        {separator}

        {/* Alignment */}
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }}
          className={iconBtnClass(editor.isActive({ textAlign: 'left' }))}
          title="Align left"
        ><AlignLeft size={14} /></button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }}
          className={iconBtnClass(editor.isActive({ textAlign: 'center' }))}
          title="Align center"
        ><AlignCenter size={14} /></button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }}
          className={iconBtnClass(editor.isActive({ textAlign: 'right' }))}
          title="Align right"
        ><AlignRight size={14} /></button>
      </div>

      {/* Dropdown Panels — rendered below toolbar */}
      {activePicker === 'link' && (
        <div className={dropdownClass} style={{ left: 0, minWidth: '12rem' }}>
          <input
            ref={linkInputRef}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') setActivePicker(null);
            }}
            placeholder="Paste link..."
            className="w-48 rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none"
          />
        </div>
      )}

      {activePicker === 'color' && (
        <div className={dropdownClass}>
          <div className="grid grid-cols-4 gap-1">
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
                  setActivePicker(null);
                }}
                className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value || '#171717' }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      )}

      {activePicker === 'highlight' && (
        <div className={dropdownClass}>
          <div className="grid grid-cols-4 gap-1">
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
                  setActivePicker(null);
                }}
                className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value || '#FFFFFF' }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      )}

      {activePicker === 'heading' && (
        <div className={dropdownClass} style={{ minWidth: '8rem' }}>
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.value}
              onMouseDown={(e) => {
                e.preventDefault();
                if (bt.value === 'paragraph') {
                  editor.chain().focus().setParagraph().run();
                } else {
                  const level = parseInt(bt.value.replace('h', '')) as 1 | 2 | 3;
                  editor.chain().focus().toggleHeading({ level }).run();
                }
                setActivePicker(null);
              }}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              {bt.label}
            </button>
          ))}
        </div>
      )}

      {activePicker === 'fontSize' && (
        <div className={dropdownClass} style={{ minWidth: '7rem' }}>
          {FONT_SIZES.map((fs) => (
            <button
              key={fs.label}
              onMouseDown={(e) => {
                e.preventDefault();
                if (fs.value) {
                  (editor.commands as any).setFontSize(fs.value);
                } else {
                  (editor.commands as any).unsetFontSize();
                }
                setActivePicker(null);
              }}
              className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent"
            >
              {fs.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
