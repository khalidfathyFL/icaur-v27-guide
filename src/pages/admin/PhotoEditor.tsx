import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from 'lucide-react'
import { useToast } from '../../components/panel/feedback'
import { useShortText } from '../../i18n/languageContext'
import { api, type PartImage, type UploadFolder } from '../../lib/api'
import { compressImage } from '../../lib/compressImage'
import { errorMessage } from '../../lib/errors'

/**
 * The photo section of a listing form: upload (shrunk first), describe,
 * reorder and remove. Photos land in Blob as soon as they are picked; the
 * listing only points at them once the form is saved.
 */
export function PhotoEditor({
  folder,
  images,
  onChange,
  onUploadingChange,
  max = 8,
}: {
  folder: UploadFolder
  images: PartImage[]
  /** Takes an updater, because uploads finish after the form may have changed. */
  onChange: (update: (images: PartImage[]) => PartImage[]) => void
  /** How many uploads are running, so the form can hold its save button. */
  onUploadingChange: (count: number) => void
  max?: number
}) {
  const tx = useShortText()
  const toast = useToast()
  const [uploading, setUploading] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => onUploadingChange(uploading), [uploading, onUploadingChange])

  function move(index: number, by: -1 | 1) {
    onChange((current) => {
      const next = [...current]
      const target = index + by
      if (target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    const room = max - images.length - uploading
    if (files.length > room) {
      toast(tx(`Only ${room} more photo(s) fit; the rest were skipped.`, `يتسع لـ ${room} صورة فقط؛ تم تجاهل الباقي.`), 'error')
    }

    for (const file of files.slice(0, Math.max(0, room))) {
      setUploading((count) => count + 1)
      try {
        const { blob, fileName } = await compressImage(file)
        const image = await api.uploadImage(folder, blob, fileName)
        onChange((current) => [...current, image])
      } catch (caught) {
        toast(errorMessage(caught, tx(`Could not upload ${file.name}.`, `تعذر رفع ${file.name}.`)), 'error')
      } finally {
        setUploading((count) => count - 1)
      }
    }
  }

  return (
    <section className="part-form-section">
      <h3>
        {tx('Photos', 'الصور')} <small className="panel-muted">{`${images.length}/${max}`}</small>
      </h3>
      <div className="part-photos">
        {images.map((image, index) => (
          <figure key={image.url}>
            <img src={image.url} alt={image.alt ?? ''} />
            <input
              value={image.alt ?? ''}
              onChange={(e) => {
                const alt = e.target.value || undefined
                onChange((current) => current.map((item, at) => (at === index ? { ...item, alt } : item)))
              }}
              maxLength={200}
              placeholder={tx('Describe the photo', 'صف الصورة')}
              aria-label={tx('Photo description', 'وصف الصورة')}
            />
            <figcaption className="panel-row-actions">
              <button type="button" className="panel-icon-button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={tx('Move earlier', 'قدّمها')} title={tx('Move earlier', 'قدّمها')}>
                <ArrowLeft size={14} className="flip-rtl" />
              </button>
              <button type="button" className="panel-icon-button" disabled={index === images.length - 1} onClick={() => move(index, 1)} aria-label={tx('Move later', 'أخّرها')} title={tx('Move later', 'أخّرها')}>
                <ArrowRight size={14} className="flip-rtl" />
              </button>
              <button
                type="button"
                className="panel-icon-button danger"
                onClick={() => onChange((current) => current.filter((_, at) => at !== index))}
                aria-label={tx('Remove photo', 'احذف الصورة')}
                title={tx('Remove photo', 'احذف الصورة')}
              >
                <Trash2 size={14} />
              </button>
            </figcaption>
          </figure>
        ))}
        {images.length + uploading < max && (
          <button type="button" className="part-photo-add" onClick={() => fileInput.current?.click()} disabled={uploading > 0}>
            <ImagePlus size={22} aria-hidden="true" />
            <span>{uploading > 0 ? tx(`Uploading ${uploading}…`, `جارٍ رفع ${uploading}…`) : tx('Add photos', 'أضف صورا')}</span>
          </button>
        )}
      </div>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={onFiles} />
      <small className="panel-muted">
        {tx(
          'Photos are resized to 1600 px and compressed before upload. The first photo is the one shown in the list.',
          'يتم تصغير الصور إلى 1600 بكسل وضغطها قبل الرفع. الصورة الأولى هي التي تظهر في القائمة.',
        )}
      </small>
    </section>
  )
}
