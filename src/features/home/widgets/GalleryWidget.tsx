import { useState, useEffect, useRef, useCallback } from 'react'
import type { GalleryImage, Module } from '../../../shared/api-types'
import { resolveHomeWidgetState } from '../../app-shell/homeWidgets'
import { GalleryLightbox } from '../../gallery/GalleryLightbox'

export function GalleryWidget({
  module,
  images,
  onSetActiveTab,
}: {
  module: Module
  images: GalleryImage[]
  onSetActiveTab: (tab: 'gallery') => void
}) {
  const widget = resolveHomeWidgetState(module)
  if (!widget) return null

  const safeImages = images ?? []
  if (safeImages.length === 0) {
    return (
      <article id={module.id} className={`panel module-${module.size} gallery-widget`}>
        <p className="kicker">Gallery</p>
        <h2>Photo gallery</h2>
        <div className="gallery-empty">
          <p>No photos yet. Connect Google Drive in admin settings to get started.</p>
        </div>
      </article>
    )
  }

  const showMetadata = Boolean(module.options.showMetadata)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (widget.mode === 'grid') {
    const preview = safeImages.slice(0, 6)
    return (
      <article id={module.id} className={`panel module-${module.size} gallery-widget`}>
        <div className="gallery-widget-head">
          <div>
            <p className="kicker">Gallery</p>
            <h2>Photos</h2>
          </div>
          <button type="button" className="ghost" onClick={() => onSetActiveTab('gallery')}>View all</button>
        </div>
        <div className="gallery-grid-mini">
          {preview.map((image, i) => (
            <button key={image.id} type="button" className="gallery-thumb" onClick={() => setLightboxIndex(i)}>
              <img src={image.thumbnailLink} alt={image.name} loading="lazy" />
            </button>
          ))}
        </div>
        {safeImages.length > 6 && (
          <div className="stack-list">
            <button type="button" className="plain-row" onClick={() => onSetActiveTab('gallery')}>
              <strong>{safeImages.length - 6} more photos</strong>
              <span>Open the gallery to see everything.</span>
            </button>
          </div>
        )}
        {lightboxIndex !== null && (
          <GalleryLightbox images={preview} startIndex={lightboxIndex} showMetadata={showMetadata} onClose={() => setLightboxIndex(null)} />
        )}
      </article>
    )
  }

  if (widget.mode === 'slideshow') {
    return <GallerySlideshowWidget module={module} images={safeImages} showMetadata={showMetadata} onSetActiveTab={onSetActiveTab} />
  }

  return <GalleryPolaroidWidget module={module} images={safeImages} showMetadata={showMetadata} onSetActiveTab={onSetActiveTab} />
}

function GallerySlideshowWidget({
  module,
  images,
  showMetadata,
  onSetActiveTab,
}: {
  module: Module
  images: GalleryImage[]
  showMetadata: boolean
  onSetActiveTab: (tab: 'gallery') => void
}) {
  const [index, setIndex] = useState(0)
  const interval = Number(module.options.slideshowInterval) || 5
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || images.length <= 1) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), interval * 1000)
    return () => clearInterval(timer)
  }, [paused, images.length, interval])

  const image = images[index]
  if (!image) return null

  return (
    <article id={module.id} className={`panel module-${module.size} gallery-widget gallery-slideshow-widget`}>
      <div className="gallery-widget-head">
        <div>
          <p className="kicker">Gallery</p>
          <h2>Slideshow</h2>
        </div>
        <div className="gallery-slideshow-controls">
          <button type="button" className="ghost" onClick={() => setPaused((p) => !p)}>{paused ? '▶' : '❚❚'}</button>
          <button type="button" className="ghost" onClick={() => onSetActiveTab('gallery')}>View all</button>
        </div>
      </div>
      <div className="gallery-slideshow-frame" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <img src={image.webContentLink || image.thumbnailLink} alt={image.name} className="gallery-slideshow-image" />
        {showMetadata && (
          <div className="gallery-slideshow-meta">
            <span>{image.name}</span>
          </div>
        )}
      </div>
      <div className="gallery-slideshow-dots">
        {images.slice(0, 12).map((_, i) => (
          <button key={i} type="button" className={`gallery-dot${i === index ? ' active' : ''}`} onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`} />
        ))}
      </div>
    </article>
  )
}

function GalleryPolaroidWidget({
  module,
  images,
  showMetadata,
  onSetActiveTab,
}: {
  module: Module
  images: GalleryImage[]
  showMetadata: boolean
  onSetActiveTab: (tab: 'gallery') => void
}) {
  const preview = images.slice(0, 4)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const rotations = [-3, 2, -1, 3]

  return (
    <article id={module.id} className={`panel module-${module.size} gallery-widget gallery-polaroid-widget`}>
      <div className="gallery-widget-head">
        <div>
          <p className="kicker">Gallery</p>
          <h2>Photos</h2>
        </div>
        <button type="button" className="ghost" onClick={() => onSetActiveTab('gallery')}>View all</button>
      </div>
      <div className="gallery-polaroid-scatter">
        {preview.map((image, i) => (
          <button
            key={image.id}
            type="button"
            className="gallery-polaroid-card"
            style={{ transform: `rotate(${rotations[i % rotations.length]}deg)` }}
            onClick={() => setLightboxIndex(i)}
          >
            <img src={image.thumbnailLink} alt={image.name} loading="lazy" />
            {showMetadata && <span className="gallery-polaroid-label">{image.name.replace(/\.[^.]+$/, '')}</span>}
          </button>
        ))}
      </div>
      {lightboxIndex !== null && (
        <GalleryLightbox images={preview} startIndex={lightboxIndex} showMetadata={showMetadata} onClose={() => setLightboxIndex(null)} />
      )}
    </article>
  )
}
