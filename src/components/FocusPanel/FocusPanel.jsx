import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './FocusPanel.css'

export default function FocusPanel({ item, tags, onClose }) {
  const itemTags = (item?.tags || []).map(tid => tags.find(t => t.id === tid)).filter(Boolean)

  // Escape to close
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Dim backdrop — clicking it closes focus */}
          <motion.div
            className="focus-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Detail panel */}
          <motion.div
            className="focus-panel"
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            onClick={e => e.stopPropagation()}
          >
            <button className="focus-panel__close" onClick={onClose} title="Close (Esc)">
              ✕
            </button>

            {/* Title */}
            {item.title && (
              <h2 className="focus-panel__title">{item.title}</h2>
            )}

            {/* Tags */}
            {itemTags.length > 0 && (
              <div className="focus-panel__tags">
                {itemTags.map(tag => (
                  <span
                    key={tag.id}
                    className="focus-panel__tag"
                    style={{ background: tag.color + '22', color: tag.color, borderColor: tag.color + '55' }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            {/* Description / Note */}
            {item.note && (
              <div className="focus-panel__section">
                <span className="focus-panel__label">Description</span>
                <p className="focus-panel__note">{item.note}</p>
              </div>
            )}

            {/* URL */}
            {item.url && item.type !== 'text' && (
              <div className="focus-panel__section">
                <span className="focus-panel__label">URL</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-panel__url"
                >
                  {(() => { try { return new URL(item.url).hostname } catch { return item.url } })()}
                  <span className="focus-panel__url-arrow">↗</span>
                </a>
              </div>
            )}

            {/* Type badge */}
            <div className="focus-panel__section">
              <span className="focus-panel__label">Type</span>
              <span className="focus-panel__type-badge">{item.type}</span>
            </div>

            {/* Added date */}
            {item.dateAdded && (
              <div className="focus-panel__date">Added {item.dateAdded}</div>
            )}

            {/* Open button */}
            {item.url && item.type !== 'text' && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-panel__open-btn"
              >
                Open ↗
              </a>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
