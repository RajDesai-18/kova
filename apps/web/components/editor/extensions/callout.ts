import { Node, mergeAttributes } from '@tiptap/core';

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      emoji: {
        default: '💡',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-emoji') || '💡',
        renderHTML: (attributes: Record<string, string>) => ({ 'data-emoji': attributes.emoji }),
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
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { emoji: attrs?.emoji || '💡' },
            content: [{ type: 'paragraph' }],
          });
        },
    } as any;
  },
});
