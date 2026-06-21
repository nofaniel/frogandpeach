import { useState } from 'react'
import type { GalleryImage } from '../../shared/api-types'

export function GalleryLightbox({
  images,
  startIndex,
  showMetadata,
  onClose,
}: {
  images: GalleryImage[]
  startIndex: number
  showMetadata: boolean
  onClose: () => void
}) {
  const [index, setIndex] = useState(startIndex)

  function prev() {
    setIndex((i) => (i > 0 ? i - 1 : images.length - 1))
  }

  function next() {
    setIndex((i) => (i < images.length - 1 ? i + 1 : 0))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
  }

  const image = images[index]
  if (!image) return null

  const src = image.webContentLink || image.thumbnailLink

  return (
    <div className="lightbox-overlay" onClick={onClose} onKeyDown={handleKeyDown} role="dialog" aria-modal="true" tabIndex={-1}>
      <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">×</button>
        <button type="button" className="lightbox-prev" onClick={prev} aria-label="Previous">‹</button>
        <div className="lightbox-image-wrap">
          <img src={src} alt={image.name} className="lightbox-image" />
          {showMetadata && (
            <div className="lightbox-meta">
              <span className="lightbox-name">{image.name}</span>
              {image.createdTime && <span className="lightbox-date">{new Date(image.createdTime).toLocaleDateString()}</span>}
              <span className="lightbox-counter">{index + 1} / {images.length}</span>
            </div>
          )}
        </div>
        <button type="button" className="lightbox-next" onClick={next} aria-label="Next">›</button>
      </div>
    </div>
  )
}
