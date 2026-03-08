import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'block+',

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

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'toggle', class: 'toggle-block' }),
      0,
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let isOpen = node.attrs.open as boolean;
      let currentTitle = node.attrs.title as string;

      const wrapper = document.createElement('div');
      wrapper.classList.add('toggle-block');
      wrapper.setAttribute('data-type', 'toggle');

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

      const content = document.createElement('div');
      content.classList.add('toggle-content');
      if (!isOpen) {
        content.style.display = 'none';
      }

      wrapper.append(summary, content);

      return {
        dom: wrapper,
        contentDOM: content,
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
      };
    };
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
    };
  },
});
