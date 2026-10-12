import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { EmbedNode } from './EmbedNode'
import { embedTitle, toEmbedUrl } from './embeds'
import { api } from '../../lib/api'
import { compressImage } from '../../lib/compressImage'
import { errorMessage } from '../../lib/errors'
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  MonitorPlay,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from 'lucide-react'
import { useLanguage } from '../../i18n/languageContext'

/**
 * The post editor.
 *
 * Only the marks the API's sanitizer allows are offered, so what a contributor
 * sees in the editor is what survives being saved. Anything added here needs a
 * matching entry in `api/_lib/sanitize.ts` or it will silently disappear.
 */

type ToolbarButton = {
  key: string
  icon: typeof Bold
  label: string
  isActive?: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const imagesIn = (files: FileList | null | undefined) =>
  Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))

/**
 * Shrinks each photo, sends it to Vercel Blob, then places it at the cursor.
 * The post only points at the Blob address; the sanitizer drops any image
 * that does not live there, so this is the only way an image gets in.
 */
async function uploadInto(view: Editor['view'], files: File[], onError: (file: File, caught: unknown) => void) {
  for (const file of files) {
    try {
      const { blob, fileName } = await compressImage(file)
      const image = await api.uploadImage('posts', blob, fileName)
      const node = view.state.schema.nodes.image?.create({ src: image.url, alt: '' })
      if (node) view.dispatch(view.state.tr.replaceSelectionWith(node))
    } catch (caught) {
      onError(file, caught)
    }
  }
}

export function RichTextEditor({
  value,
  onChange,
  dir = 'ltr',
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  dir?: 'ltr' | 'rtl'
  placeholder?: string
}) {
  const { tx } = useLanguage()
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)

  async function upload(view: Editor['view'], files: File[]) {
    if (files.length === 0) return
    setUploading((count) => count + files.length)
    await uploadInto(view, files, (file, caught) => {
      window.alert(errorMessage(caught, tx(`Could not upload ${file.name}.`, `تعذر رفع ${file.name}.`)))
    })
    setUploading((count) => count - files.length)
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Offered marks must match the server allowlist; h1 is the page title.
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        // Mirrors the sanitizer, so a pasted javascript: URL never survives.
        protocols: ['http', 'https', 'mailto', 'tel'],
      }),
      EmbedNode,
      // Block images only, and never inline base64: every image is a Blob address.
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class: 'tiptap-surface',
        dir,
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
      },
      // A pasted screenshot or a dropped photo goes through the same upload as
      // the toolbar button, instead of being lost or embedded as base64.
      handlePaste: (view, event) => {
        const files = imagesIn(event.clipboardData?.files)
        if (files.length === 0) return false
        void upload(view, files)
        return true
      },
      handleDrop: (view, event) => {
        const files = imagesIn(event.dataTransfer?.files)
        if (files.length === 0) return false
        void upload(view, files)
        return true
      },
    },
  })

  // Keep the editor in step when the form resets after a successful submit.
  useEffect(() => {
    if (editor && value === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.clearContent()
    }
  }, [editor, value])

  if (!editor) return null

  const buttons: ToolbarButton[] = [
    { key: 'bold', icon: Bold, label: tx('Bold', 'عريض'), isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
    { key: 'italic', icon: Italic, label: tx('Italic', 'مائل'), isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
    { key: 'strike', icon: Strikethrough, label: tx('Strikethrough', 'يتوسطه خط'), isActive: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
    { key: 'h2', icon: Heading2, label: tx('Heading', 'عنوان'), isActive: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { key: 'h3', icon: Heading3, label: tx('Subheading', 'عنوان فرعي'), isActive: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
    { key: 'ul', icon: List, label: tx('Bullet list', 'قائمة نقطية'), isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
    { key: 'ol', icon: ListOrdered, label: tx('Numbered list', 'قائمة مرقمة'), isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
    { key: 'quote', icon: Quote, label: tx('Quote', 'اقتباس'), isActive: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
    { key: 'code', icon: Code, label: tx('Code', 'كود'), isActive: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
  ]

  function setLink() {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const href = window.prompt(tx('Link address', 'عنوان الرابط'), previous ?? 'https://')
    if (href === null) return

    if (href === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run()
  }

  function addEmbed() {
    if (!editor) return
    const raw = window.prompt(
      tx('Paste a YouTube, Bilibili or Vimeo link', 'الصق رابط يوتيوب أو بيليبيلي أو فيميو'),
      'https://',
    )
    if (!raw) return

    const src = toEmbedUrl(raw)
    if (!src) {
      // Everything else stays a link: no other host here has a plain player.
      window.alert(
        tx(
          'That link cannot be embedded. Add it as a normal link instead.',
          'هذا الرابط لا يمكن تضمينه. أضفه كرابط عادي بدلا من ذلك.',
        ),
      )
      return
    }

    editor.chain().focus().setEmbed({ src, title: embedTitle(src) }).run()
  }

  function onFilesChosen(event: ChangeEvent<HTMLInputElement>) {
    const files = imagesIn(event.target.files)
    // Cleared so picking the same photo again still fires a change.
    event.target.value = ''
    if (editor) void upload(editor.view, files)
  }

  return (
    <div className="tiptap">
      <div className="tiptap-toolbar" role="toolbar" aria-label={tx('Formatting', 'التنسيق')}>
        {buttons.map((button) => {
          const Icon = button.icon
          return (
            <button
              key={button.key}
              type="button"
              title={button.label}
              aria-label={button.label}
              aria-pressed={button.isActive?.(editor) ?? false}
              className={button.isActive?.(editor) ? 'active' : ''}
              onClick={() => button.run(editor)}
            >
              <Icon size={16} />
            </button>
          )
        })}

        <span className="tiptap-divider" />

        <button
          type="button"
          title={tx('Add link', 'أضف رابطا')}
          aria-label={tx('Add link', 'أضف رابطا')}
          className={editor.isActive('link') ? 'active' : ''}
          onClick={setLink}
        >
          <Link2 size={16} />
        </button>
        <button
          type="button"
          title={tx('Remove link', 'أزل الرابط')}
          aria-label={tx('Remove link', 'أزل الرابط')}
          disabled={!editor.isActive('link')}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Link2Off size={16} />
        </button>

        <button
          type="button"
          title={tx('Embed a video', 'ضمّن فيديو')}
          aria-label={tx('Embed a video', 'ضمّن فيديو')}
          onClick={addEmbed}
        >
          <MonitorPlay size={16} />
        </button>

        <button
          type="button"
          title={uploading > 0 ? tx('Uploading…', 'جارٍ الرفع…') : tx('Add a photo', 'أضف صورة')}
          aria-label={tx('Add a photo', 'أضف صورة')}
          aria-busy={uploading > 0}
          disabled={uploading > 0}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus size={16} />
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onFilesChosen} />

        <span className="tiptap-divider" />

        <button type="button" title={tx('Undo', 'تراجع')} aria-label={tx('Undo', 'تراجع')} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={16} />
        </button>
        <button type="button" title={tx('Redo', 'إعادة')} aria-label={tx('Redo', 'إعادة')} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={16} />
        </button>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
