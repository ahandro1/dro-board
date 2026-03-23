import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCardDims } from '../../canvas/forceLayout'
import './Card.css'

const SPRING = { type: 'spring', stiffness: 80, damping: 10, mass: 1.5 }

function getYouTubeId(url) {
  const m = url?.match(/(?:[?&]v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}
function getSpotifyEmbed(url) {
  return url?.replace('open.spotify.com/', 'open.spotify.com/embed/').replace('/embed/embed/', '/embed/')
}

export default function Card({
  item, tags = [],
  x = 0, y = 0,
  isFocused = false,
  isDimmed = false,
  isConnectedHover = false,
  onFocus,
  onHover,
  onTagClick,
  onDragStart,
  adminMode = false,
  onEdit, onDelete,
  onSave,
}) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)
  const videoRef = useRef(null)
  const dragMoved = useRef(false)

  // Inline edit state — synced from item when card is focused
  const [localTitle, setLocalTitle] = useState('')
  const [localNote, setLocalNote] = useState('')
  const [localUrl, setLocalUrl] = useState('')
  const [localTags, setLocalTags] = useState([])
  const [saveFlash, setSaveFlash] = useState(false)

  useEffect(() => {
    if (isFocused) {
      setLocalTitle(item.title || '')
      setLocalNote(item.note || '')
      setLocalUrl(item.url || '')
      setLocalTags(item.tags || [])
      setSaveFlash(false)
    }
  }, [isFocused]) // eslint-disable-line

  const dims = getCardDims(item)
  const W = dims.w
  const H = dims.h
  const isPlaylist = item.url?.includes('/playlist/') || item.url?.includes('/album/')
  const itemTags = (tags || []).filter(t => item.tags?.includes(t.id))

  function toggleLocalTag(tagId) {
    setLocalTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    )
  }

  function handleSave(e) {
    e.stopPropagation()
    onSave?.({ ...item, title: localTitle, note: localNote, url: localUrl, tags: localTags })
    setSaveFlash(true)
    setTimeout(() => setSaveFlash(false), 1800)
  }

  function handleMouseEnter() {
    setHovered(true)
    onHover?.(item.id)
    if (videoRef.current) videoRef.current.play().catch(() => {})
  }
  function handleMouseLeave() {
    setHovered(false)
    onHover?.(null)
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation()
    dragMoved.current = false
    onDragStart?.(item.id, e)
  }

  function handleClick(e) {
    e.stopPropagation()
    if (!dragMoved.current) onFocus?.(item.id)
  }

  function openItem(e) {
    e.stopPropagation()
    const url = localUrl || item.url
    if (url) window.open(url, '_blank', 'noopener')
  }

  function downloadItem(e) {
    e.stopPropagation()
    const url = localUrl || item.url
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = localTitle || item.title || 'download'
    a.target = '_blank'
    a.click()
  }

  const renderMedia = () => {
    switch (item.type) {
      case 'image':
      case 'gif':
        if (imgError) return <div className="card-error">Image unavailable</div>
        return (
          <img
            src={item.url} alt={item.title || ''}
            loading="lazy" onError={() => setImgError(true)}
            className="card-img"
          />
        )
      case 'video':
        return (
          <video ref={videoRef} src={item.url}
            className="card-video" muted loop playsInline preload="metadata" />
        )
      case 'youtube': {
        const ytId = getYouTubeId(item.url)
        if (!ytId) return <div className="card-error">Invalid YouTube URL</div>
        return (
          <div className="card-iframe-wrap card-iframe-16x9">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
              title={item.title || 'YouTube'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen className="card-iframe" loading="lazy"
            />
          </div>
        )
      }
      case 'spotify': {
        const embedUrl = getSpotifyEmbed(item.url)
        const spH = isPlaylist ? 380 : 80
        return (
          <div className="card-iframe-wrap" style={{ paddingBottom: 0, height: spH }}>
            <iframe src={embedUrl} width="100%" height={spH}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy" className="card-iframe card-iframe-spotify"
              title={item.title || 'Spotify'} />
          </div>
        )
      }
      case 'iframe':
        return (
          <div className="card-iframe-wrap" style={{ paddingBottom: 0, height: H - 4 }}>
            <iframe src={item.url} className="card-iframe"
              title={item.title || 'Embedded site'} loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms" />
          </div>
        )
      case 'website':
        return (
          <>
            <div className="card-url-bar">
              <span className="card-url-dot" /><span className="card-url-dot" /><span className="card-url-dot" />
              <span className="card-url-host">
                {(() => { try { return new URL(item.url).hostname } catch { return item.url } })()}
              </span>
            </div>
            <div className="card-iframe-wrap" style={{ paddingBottom: 0, height: H - 32 }}>
              <iframe src={item.url} className="card-iframe"
                title={item.title || item.url} loading="lazy"
                sandbox="allow-scripts allow-same-origin allow-forms" />
            </div>
          </>
        )
      case 'text':
        return (
          <div className="card-text">
            {item.title && <p className="card-text-title">{item.title}</p>}
            {item.note && <p className="card-text-body">{item.note}</p>}
          </div>
        )
      default:
        return <div className="card-error">Unknown type: {item.type}</div>
    }
  }

  return (
    <motion.div
      className={[
        'card',
        item.type === 'text' ? 'card-type-text' : '',
        isFocused ? 'card--focused' : '',
        isDimmed ? 'card--dimmed' : '',
        isConnectedHover ? 'card--connected-hover' : '',
      ].filter(Boolean).join(' ')}
      style={{
        position: 'absolute',
        width: W,
        height: (item.type === 'spotify' || item.type === 'text') ? 'auto' : H,
        left: 0, top: 0,
        cursor: isFocused ? 'default' : 'pointer',
        outline: item.pinned ? '2px dashed rgba(0,0,0,0.2)' : 'none',
        overflow: isFocused ? 'visible' : 'hidden',
      }}
      animate={{ x: x - W / 2, y: y - H / 2 }}
      transition={SPRING}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      whileHover={!isDimmed && !isFocused ? { scale: 1.025, zIndex: 10 } : {}}
      layout={false}
      data-id={item.id}
    >
      {/* Media — wrapped so overflow:hidden + border-radius clip stays when card is focused */}
      <div className="card-media-inner">
        {renderMedia()}
      </div>

      {/* Pin badge */}
      {item.pinned && <div className="card-pin-badge" title="Pinned">📌</div>}

      {/* Tag dots */}
      {itemTags.length > 0 && !isFocused && (
        <div className="card-tags">
          {itemTags.map(t => (
            <button
              key={t.id} className="card-tag-dot"
              style={{ background: t.color }} title={t.name}
              onClick={e => { e.stopPropagation(); onTagClick?.(t.id) }}
            />
          ))}
        </div>
      )}

      {/* Hover overlay (not shown when focused) */}
      <AnimatePresence>
        {hovered && !isDimmed && !isFocused && (
          <motion.div
            className="card-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {(item.title || item.note) && (
              <div className="card-overlay-info">
                {item.title && <span className="card-overlay-title">{item.title}</span>}
                {item.note && <span className="card-overlay-note">{item.note}</span>}
              </div>
            )}
            <div className="card-overlay-actions">
              {item.url && item.type !== 'text' && (
                <motion.button className="card-action-btn" onClick={openItem}
                  initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.04 }}>
                  Open ↗
                </motion.button>
              )}
              {adminMode && (
                <>
                  <motion.button className="card-action-btn"
                    onClick={e => { e.stopPropagation(); onEdit?.(item) }}
                    initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06 }}>
                    Edit
                  </motion.button>
                  <motion.button className="card-action-btn card-action-delete"
                    onClick={e => { e.stopPropagation(); onDelete?.(item.id) }}
                    initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}>
                    ✕
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Focus expand ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="card-expand"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Save button — top right of card */}
            <button
              className={`card-expand-save ${saveFlash ? 'card-expand-save--ok' : ''}`}
              onClick={handleSave}
            >
              {saveFlash ? 'Saved ✓' : 'Save'}
            </button>

            {/* Open + Download — bottom of card */}
            <div className="card-expand-card-actions">
              {(localUrl || item.url) && item.type !== 'text' && (
                <button className="card-expand-open" onClick={openItem}>Open ↗</button>
              )}
              {(localUrl || item.url) && ['image','gif','video'].includes(item.type) && (
                <button className="card-expand-dl" onClick={downloadItem} title="Download">
                  <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                    <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Right panel — note + url */}
            <div className="card-expand-right">
              <textarea
                className="card-expand-textarea"
                placeholder="Description"
                value={localNote}
                onChange={e => setLocalNote(e.target.value)}
                rows={5}
              />
              <input
                className="card-expand-input"
                placeholder="Url (optional)"
                value={localUrl}
                onChange={e => setLocalUrl(e.target.value)}
              />
            </div>

            {/* Bottom panel — title + tags */}
            <div className="card-expand-bottom">
              <input
                className="card-expand-input card-expand-title-input"
                placeholder="Title"
                value={localTitle}
                onChange={e => setLocalTitle(e.target.value)}
              />
              {tags.length > 0 && (
                <div className="card-expand-tags">
                  {tags.map(t => (
                    <button
                      key={t.id}
                      className={`card-expand-tag ${localTags.includes(t.id) ? 'card-expand-tag--on' : ''}`}
                      style={localTags.includes(t.id) ? { background: t.color, borderColor: t.color, color: '#fff' } : {}}
                      onClick={() => toggleLocalTag(t.id)}
                    >
                      <span className="card-expand-tag-dot" style={{ background: localTags.includes(t.id) ? 'rgba(255,255,255,0.7)' : t.color }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
