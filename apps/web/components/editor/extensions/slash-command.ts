import { Extension } from '@tiptap/core';
import { Suggestion, type SuggestionOptions } from '@tiptap/suggestion';

export const SlashCommandExtension = Extension.create<{
  suggestion: Omit<SuggestionOptions, 'editor'>;
}>({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.action(editor);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
