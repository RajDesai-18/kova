'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useRef, useEffect } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type * as Y from 'yjs';
import { BubbleToolbar } from './bubble-toolbar';
import { SlashCommand, type SlashCommandRef } from './slash-command';
import { SlashCommandExtension } from './extensions/slash-command';
import { Toggle } from './extensions/toggle';
import { Callout } from './extensions/callout';
import { FontSize } from './extensions/font-size';

interface EditorProps {
  provider: HocuspocusProvider;
  ydoc: Y.Doc;
  user: { name: string; color: string };
  initialContent?: unknown;
  editable?: boolean;
}

export function Editor({ provider, ydoc, user, initialContent, editable = true }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const migrationDoneRef = useRef(false);
  const slashCommandRef = useRef<SlashCommandRef>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands...",
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Superscript,
      Subscript,
      FontSize,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Toggle,
      Callout,
      SlashCommandExtension.configure({
        suggestion: {
          char: '/',
          startOfLine: true,
          command: ({ editor: e, range, props }) => {
            e.chain().focus().deleteRange(range).run();
            props.action(e);
          },
          render: () => ({
            onStart: (props) => slashCommandRef.current?.onStart(props),
            onUpdate: (props) => slashCommandRef.current?.onUpdate(props),
            onKeyDown: (props) => slashCommandRef.current?.onKeyDown(props) ?? false,
            onExit: () => slashCommandRef.current?.onExit(),
          }),
        },
      }),
      Collaboration.configure({
        document: ydoc,
      }),
      CollaborationCursor.configure({
        provider,
        user: {
          name: user.name,
          color: user.color,
        },
      }),
    ],
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px]',
      },
    },
  });

  // First-load migration: if Y.Doc is empty and we have existing JSON content, populate it
  useEffect(() => {
    if (!editor || !initialContent || migrationDoneRef.current) return;

    const handleSynced = () => {
      if (migrationDoneRef.current) return;
      const fragment = ydoc.getXmlFragment('default');
      if (fragment.length === 0 && initialContent) {
        migrationDoneRef.current = true;
        editor.commands.setContent(initialContent as Parameters<TiptapEditor['commands']['setContent']>[0]);
      }
    };

    provider.on('synced', handleSynced);

    // Also check immediately if already synced
    if (provider.isSynced) {
      handleSynced();
    }

    return () => {
      provider.off('synced', handleSynced);
    };
  }, [editor, initialContent, provider, ydoc]);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="relative">
      <BubbleToolbar editor={editor} containerRef={containerRef} />
      <SlashCommand ref={slashCommandRef} />
      <EditorContent editor={editor} />
    </div>
  );
}
