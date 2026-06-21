import { useState } from 'react'
import type { GalleryImage, Module } from '../../shared/api-types'
import { GalleryLightbox } from './GalleryLightbox'

export function GalleryWorkspace({
  images,
  module,
}: {
  images: GalleryImage[]
  module?: Module
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'polaroid'>('grid')
  const showMetadata = Boolean(module?.options.showMetadata)

  if (images.length === 0) {
    return (
      <section className="workspace-grid gallery-workspace">
        <article className="panel span-2 gallery-empty-panel">
          <p className="kicker">Gallery</p>
          <h2>No photos yet</h2>
          <p>Connect Google Drive in admin settings and select a folder to display photos here.</p>
        </article>
      </section>
    )
  }

  return (
    <section className="workspace-grid gallery-workspace">
      <article className="panel span-2">
        <div className="gallery-workspace-head">
          <div>
            <p className="kicker">Gallery</p>
            <h2>{images.length} photo{images.length === 1 ? '' : 's'}</h2>
          </div>
          <div className="gallery-view-toggle">
            <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}>Grid</button>
            <button type="button" className={viewMode === 'polaroid' ? 'active' : ''} onClick={() => setViewMode('polaroid')}>Polaroid</button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="gallery-grid-full">
            {images.map((image, i) => (
              <button key={image.id} type="button" className="gallery-thumb" onClick={() => setLightboxIndex(i)}>
                <img src={image.thumbnailLink} alt={image.name} loading="lazy" />
              </button>
            ))}
          </div>
        ) : (
          <div className="gallery-polaroid-full">
            {images.map((image, i) => {
              const rotation = ((i * 7 + 3) % 7) - 3
              return (
                <button
                  key={image.id}
                  type="button"
                  className="gallery-polaroid-card"
                  style={{ transform: `rotate(${rotation}deg)` }}
                  onClick={() => setLightboxIndex(i)}
                >
                  <img src={image.thumbnailLink} alt={image.name} loading="lazy" />
                  {showMetadata && <span className="gallery-polaroid-label">{image.name.replace(/\.[^.]+$/, '')}</span>}
                </button>
              )
            })}
          </div>
        )}
      </article>

      {lightboxIndex !== null && (
        <GalleryLightbox images={images} startIndex={lightboxIndex} showMetadata={showMetadata} onClose={() => setLightboxIndex(null)} />
      )}
    </section>
  )
}
