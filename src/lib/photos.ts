const MAX_WIDTH = 1200
const THUMB_WIDTH = 400
const JPEG_QUALITY = 0.8
const THUMB_QUALITY = 0.7

function resizeImage(file: Blob, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (file.size === 0) {
      reject(new Error('Empty image file'))
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width === 0 || img.height === 0) {
        reject(new Error('Image has zero dimensions'))
        return
      }
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context unavailable'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Failed to compress image'))),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export async function compressPhoto(file: Blob): Promise<{ photo: Blob; thumb: Blob }> {
  const [photo, thumb] = await Promise.all([
    resizeImage(file, MAX_WIDTH, JPEG_QUALITY),
    resizeImage(file, THUMB_WIDTH, THUMB_QUALITY),
  ])
  return { photo, thumb }
}

export function createObjectURL(blob: Blob | undefined): string | undefined {
  return blob ? URL.createObjectURL(blob) : undefined
}
