import { useStore } from '@nanostores/react';
import { useEffect, useMemo } from 'react';
import { $selectedCard } from './stores';
import { getMoodboardItems } from './data-adapter';

export default function DetailOverlay() {
  const selectedCardId = useStore($selectedCard);
  const items = useMemo(() => getMoodboardItems(), []);
  const selectedItem = items.find((item) => item.id === selectedCardId);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        $selectedCard.set(null);
      }
    };

    if (selectedCardId) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [selectedCardId]);

  if (!selectedItem) return null;

  const { youtubeId, sourceMetadata } = selectedItem;

  return (
    <div
      className="detail-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          $selectedCard.set(null);
        }
      }}
    >
      <button
        type="button"
        className="close-button"
        aria-label="Close"
        onClick={() => $selectedCard.set(null)}
      >
        ×
      </button>

      <div
        className="detail-content"
        // A native <dialog> needs imperative showModal()/close() and this
        // backdrop restyled onto ::backdrop; that migration is ticket 19, and
        // it would also let the Escape effect above be deleted. role="dialog"
        // is the correct ARIA fallback until then.
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-overlay-title"
      >
        <div className={youtubeId ? 'detail-media is-video' : 'detail-media'}>
          {youtubeId ? (
            <div className="detail-video">
              {/*
                oxlint's iframe-missing-sandbox rejects allow-scripts plus
                allow-same-origin as a pair, because together they normally let
                a SAME-origin frame remove its own sandbox. That does not apply
                here: the src is cross-origin, so allow-same-origin restores
                youtube-nocookie.com's origin, not this site's.

                Both halves are load-bearing — measured in Chrome against a
                real embed: allow-scripts alone renders a black frame, and so
                does dropping allow-same-origin. The sandbox below is therefore
                the most restrictive one that still plays, and is strictly
                tighter than the no-sandbox original (forms, top-navigation,
                downloads and pointer-lock all stay blocked).
              */}
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
                title={selectedItem.title}
                // oxlint-disable-next-line react/iframe-missing-sandbox
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <img
              src={`/api/proxy-image?url=${encodeURIComponent(selectedItem.mediaUrl)}`}
              alt={selectedItem.title}
            />
          )}
        </div>

        <div className="detail-info">
          <div className="detail-meta">
            <span className="detail-id">{selectedItem.id}</span>
            <span className="detail-date">
              {new Date(selectedItem.date).toLocaleDateString()}
            </span>
            <span className="detail-category">{selectedItem.contentType}</span>
          </div>

          <h2 id="detail-overlay-title" className="detail-title">
            {selectedItem.title}
          </h2>

          {selectedItem.description && (
            <p className="detail-description">{selectedItem.description}</p>
          )}

          {selectedItem.tags.length > 0 && (
            <div className="detail-tags">
              <h4>Tags</h4>
              <div className="tags-list">
                {selectedItem.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sourceMetadata.originalUrl && (
            <a
              className="detail-source"
              href={sourceMetadata.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {sourceMetadata.sourceDomain || 'view source'} ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
