import { Node, mergeAttributes } from '@tiptap/core'

/**
 * A video player as a block node.
 *
 * It renders as a plain iframe so the stored HTML needs no client-side
 * interpretation: a post body is sanitized once on the server and then
 * inserted as-is, and a custom element would mean shipping a renderer for it
 * to every reader.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (options: { src: string; title: string }) => ReturnType
    }
  }
}

export const EmbedNode = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      title: { default: 'Embedded video' },
    }
  },

  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { class: 'embed-frame' },
      [
        'iframe',
        mergeAttributes(HTMLAttributes, {
          loading: 'lazy',
          referrerpolicy: 'strict-origin-when-cross-origin',
          allowfullscreen: 'true',
        }),
      ],
    ]
  },

  addCommands() {
    return {
      setEmbed:
        (options) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    }
  },
})
