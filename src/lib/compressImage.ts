/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Phone photos are 3–5 MB; an accessory card needs nowhere near that. Resizing
 * to 1600 px on the long side and re-encoding as WebP brings a typical photo to
 * about 200 KB, which is what keeps the catalog inside the free Vercel Blob
 * allowance (1 GB stored, 10 GB served a month). Going over does not bill, it
 * blocks Blob for 30 days, so this is worth the few hundred milliseconds.
 */

const MAX_EDGE = 1600
const QUALITY = 0.8

export type CompressedImage = { blob: Blob; fileName: string }

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY))
}

/** A file name the upload route accepts: letters, digits, dots, dashes. */
function safeBaseName(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  return base || 'photo'
}

export async function compressImage(file: File): Promise<CompressedImage> {
  // `imageOrientation` applies the EXIF rotation, so portrait phone photos
  // do not come out sideways once the metadata is dropped.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot resize images.')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  // Safari before 17 cannot encode WebP and quietly returns PNG instead,
  // which would be larger than the original; fall back to JPEG there.
  const webp = await encode(canvas, 'image/webp')
  const blob = webp?.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg')
  if (!blob) throw new Error('Could not process this image.')

  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return { blob, fileName: `${safeBaseName(file.name)}.${extension}` }
}
