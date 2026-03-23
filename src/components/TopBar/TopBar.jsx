import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './TopBar.css'

export default function TopBar({
  search, onSearch,
  sortMode, onSortMode,
  tags, activeTag, onTagFilter,
  showLines, onToggleLines,
  showForces, onToggleForces,
  zoom, onZoomIn, onZoomOut, onResetView,
  focusedId, onCloseFocus,
}) {
  const [tagMenuOpen, setTagMenuOpen] = useState(false)
  const tagRef = useRef(null)

  useEffect(() => {
    function close(e) {
      if (tagRef.current && !tagRef.current.contains(e.target)) setTagMenuOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <header className="topbar">
      {/* Title */}
      <div className="topbar-left">
        <Link to="/" className="topbar-title">Dro's Board</Link>
      </div>

      {/* Search */}
      <div className="topbar-center">
        <div className="search-wrap">
          <svg className="search-icon" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="search-input"
            placeholder="Search…"
            value={search}
            onChange={e => onSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => onSearch('')}>×</button>
          )}
        </div>
      </div>

      {/* Focus mode banner */}
      {focusedId && (
        <div className="topbar-focus-banner">
          Focused — <button onClick={onCloseFocus} className="topbar-focus-close">Clear ✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="topbar-right">

        {/* Sort mode */}
        <div className="sort-group">
          {[
            { value: 'all', label: 'All' },
            { value: 'cluster', label: 'Clusters' },
            { value: 'type', label: 'By type' },
          ].map(s => (
            <button
              key={s.value}
              className={`sort-btn ${sortMode === s.value ? 'active' : ''}`}
              onClick={() => onSortMode(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        {tags?.length > 0 && (
          <div className="tag-filter-wrap" ref={tagRef}>
            <button
              className={`icon-btn ${activeTag ? 'active' : ''}`}
              onClick={() => setTagMenuOpen(o => !o)}
              title="Filter by tag"
            >
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {activeTag && <span className="tag-filter-dot" style={{ background: tags.find(t => t.id === activeTag)?.color }} />}
            </button>
            {tagMenuOpen && (
              <div className="tag-dropdown">
                {activeTag && (
                  <button className="tag-option tag-option--clear" onClick={() => { onTagFilter(activeTag); setTagMenuOpen(false) }}>
                    ✕ Clear filter
                  </button>
                )}
                {tags.map(t => (
                  <button
                    key={t.id}
                    className={`tag-option ${activeTag === t.id ? 'selected' : ''}`}
                    onClick={() => { onTagFilter(t.id); setTagMenuOpen(false) }}
                  >
                    <span className="tag-dot" style={{ background: t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="topbar-divider" />

        {/* Connection lines toggle */}
        <button
          className={`icon-btn ${showLines ? 'active' : ''}`}
          onClick={onToggleLines}
          title={showLines ? 'Hide connections' : 'Show connections'}
        >
          {/* node–edge icon */}
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="3" cy="8" r="1.8" fill="currentColor"/>
            <circle cx="13" cy="3.5" r="1.8" fill="currentColor"/>
            <circle cx="13" cy="12.5" r="1.8" fill="currentColor"/>
            <line x1="4.6" y1="7.3" x2="11.4" y2="4.2" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="4.6" y1="8.7" x2="11.4" y2="11.8" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>

        {/* Force controls toggle */}
        <button
          className={`icon-btn ${showForces ? 'active' : ''}`}
          onClick={onToggleForces}
          title="Force controls"
        >
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="4" r="1.8" fill="currentColor"/>
            <circle cx="8" cy="12" r="1.8" fill="currentColor"/>
            <line x1="8" y1="5.8" x2="8" y2="10.2" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="3" cy="8" r="1.2" fill="currentColor" opacity=".5"/>
            <circle cx="13" cy="8" r="1.2" fill="currentColor" opacity=".5"/>
          </svg>
        </button>

        <div className="topbar-divider" />

        {/* Admin */}
        <Link to="/admin" className="topbar-admin-link">Admin ↗</Link>
      </div>
    </header>
  )
}
