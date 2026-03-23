import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import InfiniteCanvas from '../../canvas/InfiniteCanvas'
import { calculateLayout, explodePositions, getCardDims } from '../../canvas/forceLayout'
import Card from '../Card/Card'
import ConnectionLines from '../ConnectionLines/ConnectionLines'
import TopBar from '../TopBar/TopBar'
import ForceControls from '../ForceControls/ForceControls'
import './Board.css'

export const DEFAULT_FORCES = {
  centerStrength: 0.12,
  repelStrength: -150,
  linkStrength: 0.3,
  linkDistance: 120,
}

// Auto-fit pan/zoom so all items are visible
function fitPositions(positions, items, setZoom, setPan) {
  const entries = Object.entries(positions)
  if (entries.length === 0) return
  const dimsMap = {}
  items.forEach(item => { dimsMap[item.id] = getCardDims(item) })

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  entries.forEach(([id, { x, y }]) => {
    const d = dimsMap[id] || { w: 260, h: 220 }
    minX = Math.min(minX, x - d.w / 2)
    maxX = Math.max(maxX, x + d.w / 2)
    minY = Math.min(minY, y - d.h / 2)
    maxY = Math.max(maxY, y + d.h / 2)
  })
  const pad = 80
  const vw = window.innerWidth
  const vh = window.innerHeight - 52
  const newZoom = Math.min(1.2, Math.max(0.15, Math.min(vw / (maxX - minX + pad * 2), vh / (maxY - minY + pad * 2))))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  setZoom(newZoom)
  setPan({ x: vw / 2 - cx * newZoom, y: vh / 2 + 52 - cy * newZoom })
}

// Smooth pan to center a specific canvas position
function panToPoint(canvasX, canvasY, currentZoom, setPan) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  setPan({ x: vw / 2 - canvasX * currentZoom, y: vh / 2 - canvasY * currentZoom })
}

export default function Board({ data, setData, adminMode = false, onDataChange }) {
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [sortMode, setSortMode] = useState('all')
  const [activeTag, setActiveTag] = useState(null)
  const [focusedId, setFocusedId] = useState(null)
  const [search, setSearch] = useState('')
  const [showLines, setShowLines] = useState(false)
  const [showForces, setShowForces] = useState(false)
  const [forces, setForces] = useState(DEFAULT_FORCES)
  const [positions, setPositions] = useState({})
  const [hoveredId, setHoveredId] = useState(null)

  // Drag state — tracked at Board level so canvas pan doesn't interfere
  const dragState = useRef(null)  // { id, startMouseX, startMouseY, startPosX, startPosY }
  const isDragging = useRef(false)

  const items = data?.items || []
  const tags = data?.tags || []

  const visibleItems = useMemo(() => {
    if (!search) return items
    const q = search.toLowerCase()
    return items.filter(item =>
      item.title?.toLowerCase().includes(q) ||
      item.note?.toLowerCase().includes(q) ||
      item.type?.toLowerCase().includes(q) ||
      (item.tags || []).some(tid => tags.find(t => t.id === tid)?.name.toLowerCase().includes(q))
    )
  }, [items, tags, search])

  // ── Layout helpers ──────────────────────────────────────────────────────────
  const runLayout = useCallback((mode, tagId, itemId, newForces, currentPositions, explode) => {
    if (explode && Object.keys(currentPositions).length > 0) {
      const exploded = explodePositions(currentPositions)
      setPositions(exploded)
      setTimeout(() => {
        setPositions(calculateLayout(visibleItems, mode, tagId || itemId, newForces, exploded))
      }, 180)
    } else {
      setPositions(calculateLayout(visibleItems, mode, tagId || itemId, newForces, currentPositions))
    }
  }, [visibleItems])

  // Initial layout + auto-fit
  useEffect(() => {
    if (visibleItems.length > 0 && Object.keys(positions).length === 0) {
      const initial = calculateLayout(visibleItems, 'all', null, forces, {})
      setPositions(initial)
      requestAnimationFrame(() => fitPositions(initial, visibleItems, setZoom, setPan))
    }
  }, [visibleItems.length]) // eslint-disable-line

  // ── Focus ───────────────────────────────────────────────────────────────────
  const handleFocus = useCallback((id) => {
    if (focusedId === id) {
      // Unfocus — glide back to previous layout, no explosion
      setFocusedId(null)
      runLayout(sortMode, activeTag, null, forces, positions, false)
      return
    }
    setFocusedId(id)
    // Directly calculate focus layout from current positions — no explosion
    const next = calculateLayout(visibleItems, 'focus', id, forces, positions)
    setPositions(next)
    // Smooth pan to center the focused card
    setTimeout(() => {
      const pos = next[id]
      if (pos) panToPoint(pos.x, pos.y, zoom, setPan)
    }, 100)
  }, [focusedId, sortMode, activeTag, forces, positions, visibleItems, zoom])

  const handleCloseFocus = useCallback(() => {
    if (!focusedId) return
    setFocusedId(null)
    runLayout(sortMode, activeTag, null, forces, positions, false)
  }, [focusedId, sortMode, activeTag, forces, positions, runLayout])

  // ── Sort / Filter ──────────────────────────────────────────────────────────
  const handleSortMode = useCallback((mode) => {
    setSortMode(mode)
    setActiveTag(null)
    setFocusedId(null)
    runLayout(mode, null, null, forces, positions, false)
  }, [forces, positions, runLayout])

  const handleTagFilter = useCallback((tagId) => {
    const newTag = tagId === activeTag ? null : tagId
    setActiveTag(newTag)
    setFocusedId(null)
    runLayout(newTag ? 'filter' : sortMode, newTag, null, forces, positions, true)
  }, [activeTag, sortMode, forces, positions, runLayout])

  // ── Drag cards ─────────────────────────────────────────────────────────────
  const handleCardDragStart = useCallback((id, e) => {
    const pos = positions[id]
    if (!pos) return
    dragState.current = {
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    }
    isDragging.current = false

    function onMove(ev) {
      const dx = (ev.clientX - dragState.current.startMouseX) / zoom
      const dy = (ev.clientY - dragState.current.startMouseY) / zoom
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true
      if (!isDragging.current) return
      setPositions(prev => ({
        ...prev,
        [id]: { x: dragState.current.startPosX + dx, y: dragState.current.startPosY + dy }
      }))
    }
    function onUp() {
      dragState.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [positions, zoom])

  // ── Canvas background click — close focus or clear tag filter ──────────────
  const handleBackgroundClick = useCallback(() => {
    if (focusedId) { handleCloseFocus(); return }
    if (activeTag) handleTagFilter(activeTag)
  }, [focusedId, activeTag, handleCloseFocus, handleTagFilter])

  // ── Forces ─────────────────────────────────────────────────────────────────
  const handleForces = useCallback((newForces) => {
    setForces(newForces)
    const mode = focusedId ? 'focus' : activeTag ? 'filter' : sortMode
    const id = focusedId || activeTag
    setPositions(calculateLayout(visibleItems, mode, id, newForces, positions))
  }, [visibleItems, focusedId, activeTag, sortMode, positions])

  // ── Inline card save ───────────────────────────────────────────────────────
  const handleSaveItem = useCallback((updatedItem) => {
    if (onDataChange) {
      onDataChange('edit', updatedItem)
    } else if (setData) {
      setData(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === updatedItem.id ? updatedItem : i)
      }))
    }
  }, [onDataChange, setData])

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const handleZoom = useCallback((factor, mx, my) => {
    setZoom(prev => {
      const next = Math.max(0.08, Math.min(5, prev * factor))
      setPan(p => ({
        x: mx - (mx - p.x) * (next / prev),
        y: my - (my - p.y) * (next / prev),
      }))
      return next
    })
  }, [])

  function zoomBtn(delta) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2
    setZoom(prev => {
      const next = Math.max(0.08, Math.min(5, prev * (delta > 0 ? 1.15 : 0.87)))
      setPan(p => ({ x: cx - (cx - p.x) * (next / prev), y: cy - (cy - p.y) * (next / prev) }))
      return next
    })
  }

  function resetView() {
    fitPositions(positions, visibleItems, setZoom, setPan)
  }

  // ── Connected card set (for hover highlight) ────────────────────────────────
  const connectedToHovered = useMemo(() => {
    if (!hoveredId) return new Set()
    const hItem = visibleItems.find(i => i.id === hoveredId)
    if (!hItem) return new Set()
    const hTags = hItem.tags || []
    return new Set(
      visibleItems.filter(i => i.id !== hoveredId && (i.tags || []).some(t => hTags.includes(t))).map(i => i.id)
    )
  }, [hoveredId, visibleItems])

  const focusedItem = focusedId ? visibleItems.find(i => i.id === focusedId) : null
  const focusedTags = focusedItem?.tags || []

  return (
    <div className="board">
      <TopBar
        search={search} onSearch={setSearch}
        sortMode={sortMode} onSortMode={handleSortMode}
        tags={tags} activeTag={activeTag} onTagFilter={handleTagFilter}
        showLines={showLines} onToggleLines={() => setShowLines(v => !v)}
        showForces={showForces} onToggleForces={() => setShowForces(v => !v)}
        zoom={zoom} onZoomIn={() => zoomBtn(1)} onZoomOut={() => zoomBtn(-1)} onResetView={resetView}
        focusedId={focusedId} onCloseFocus={handleCloseFocus}
      />

      <InfiniteCanvas
        pan={pan} zoom={zoom}
        onPanChange={setPan}
        onZoomChange={handleZoom}
        onBackgroundClick={handleBackgroundClick}
      >
        {visibleItems.map(item => {
          const pos = positions[item.id]
          if (!pos) return null
          const isFocused = item.id === focusedId
          // In focus mode: non-focused, non-connected items are dimmed
          const isDimmed = focusedId != null && !isFocused &&
            !focusedTags.some(t => (item.tags || []).includes(t))
          return (
            <Card
              key={item.id}
              item={item}
              tags={tags}
              x={pos.x}
              y={pos.y}
              isFocused={isFocused}
              isDimmed={isDimmed}
              isConnectedHover={connectedToHovered.has(item.id)}
              onFocus={handleFocus}
              onHover={setHoveredId}
              onTagClick={handleTagFilter}
              onDragStart={handleCardDragStart}
              adminMode={adminMode}
              onEdit={onDataChange ? (item) => onDataChange('edit', item) : undefined}
              onDelete={onDataChange ? (id) => onDataChange('delete', id) : undefined}
              onSave={handleSaveItem}
            />
          )
        })}

        <ConnectionLines
          items={visibleItems}
          tags={tags}
          positions={positions}
          hoveredId={hoveredId}
          visible={showLines}
        />
      </InfiniteCanvas>

      {/* Cluster labels */}
      {sortMode === 'cluster' && !focusedId && (
        <div className="board__cluster-labels"
          style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {tags.map(tag => {
            const tagItems = visibleItems.filter(i => i.tags?.includes(tag.id))
            if (tagItems.length === 0) return null
            const avgX = tagItems.reduce((s, i) => s + (positions[i.id]?.x || 0), 0) / tagItems.length
            const avgY = tagItems.reduce((s, i) => s + (positions[i.id]?.y || 0), 0) / tagItems.length
            return (
              <div key={tag.id} className="board__cluster-label"
                style={{ left: avgX, top: avgY - 80, color: tag.color, borderColor: tag.color + '44' }}>
                {tag.name}
              </div>
            )
          })}
        </div>
      )}

      {/* Force controls */}
      <ForceControls visible={showForces} forces={forces} onChange={handleForces} />

      {/* Zoom controls */}
      <div className="board__zoom-controls">
        <button onClick={() => zoomBtn(1)} title="Zoom in">+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => zoomBtn(-1)} title="Zoom out">−</button>
        <button onClick={resetView} title="Fit all" className="board__zoom-reset">⌖</button>
      </div>
    </div>
  )
}
