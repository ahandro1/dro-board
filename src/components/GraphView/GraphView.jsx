import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import './GraphView.css'

const NODE_SIZE = 72
const REPULSION = 6000
const ATTRACTION = 0.04
const DAMPING = 0.82
const CENTER_PULL = 0.018

function initNodes(items, tags, width, height) {
  const cx = width / 2
  const cy = height / 2
  return items.map((item, i) => {
    const angle = (i / items.length) * Math.PI * 2
    const r = Math.min(width, height) * 0.28
    return {
      id: item.id,
      item,
      x: cx + Math.cos(angle) * r + (Math.random() - 0.5) * 60,
      y: cy + Math.sin(angle) * r + (Math.random() - 0.5) * 60,
      vx: 0,
      vy: 0,
    }
  })
}

function buildEdges(items) {
  const edges = []
  const drawn = new Set()
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const shared = items[a].tags?.filter(t => items[b].tags?.includes(t))
      if (shared?.length) {
        const key = `${items[a].id}|${items[b].id}`
        if (!drawn.has(key)) {
          drawn.add(key)
          edges.push({ a: items[a].id, b: items[b].id, tags: shared })
        }
      }
    }
  }
  return edges
}

function getThumb(item) {
  if (item.type === 'youtube') {
    const m = item.url?.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`
  }
  if (['image','gif'].includes(item.type)) return item.url
  return null
}

export default function GraphView({ items, tags, showLines }) {
  const containerRef = useRef(null)
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(null) // node id being dragged
  const [panning, setPanning] = useState(false)
  const panStart = useRef(null)
  const animRef = useRef(null)
  const nodesRef = useRef([])
  const [hoveredNode, setHoveredNode] = useState(null)

  // Init
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const w = width || 800
    const h = height || 600
    setDims({ w, h })
    const n = initNodes(items, tags, w, h)
    const e = buildEdges(items)
    setNodes(n)
    nodesRef.current = n
    setEdges(e)
  }, [items, tags])

  // Force simulation
  useEffect(() => {
    if (nodes.length === 0) return
    let running = true

    function tick() {
      if (!running) return
      nodesRef.current = nodesRef.current.map(n => ({ ...n }))
      const ns = nodesRef.current
      const cx = dims.w / 2
      const cy = dims.h / 2

      // Repulsion
      for (let a = 0; a < ns.length; a++) {
        for (let b = a + 1; b < ns.length; b++) {
          const dx = ns[b].x - ns[a].x
          const dy = ns[b].y - ns[a].y
          const dist = Math.max(Math.sqrt(dx*dx + dy*dy), 1)
          if (dist > 400) continue
          const force = REPULSION / (dist * dist)
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          ns[a].vx -= fx; ns[a].vy -= fy
          ns[b].vx += fx; ns[b].vy += fy
        }
      }

      // Attraction along edges
      edges.forEach(e => {
        const na = ns.find(n => n.id === e.a)
        const nb = ns.find(n => n.id === e.b)
        if (!na || !nb) return
        const dx = nb.x - na.x
        const dy = nb.y - na.y
        const dist = Math.sqrt(dx*dx + dy*dy)
        const force = dist * ATTRACTION
        na.vx += (dx / dist) * force; na.vy += (dy / dist) * force
        nb.vx -= (dx / dist) * force; nb.vy -= (dy / dist) * force
      })

      // Center pull
      ns.forEach(n => {
        n.vx += (cx - n.x) * CENTER_PULL
        n.vy += (cy - n.y) * CENTER_PULL
      })

      // Integrate
      ns.forEach(n => {
        if (n.id === dragging) return
        n.vx *= DAMPING; n.vy *= DAMPING
        n.x += n.vx; n.y += n.vy
        n.x = Math.max(NODE_SIZE/2, Math.min(dims.w - NODE_SIZE/2, n.x))
        n.y = Math.max(NODE_SIZE/2, Math.min(dims.h - NODE_SIZE/2, n.y))
      })

      nodesRef.current = ns
      setNodes([...ns])
      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [edges, dims, dragging])

  // Zoom via wheel
  const handleWheel = useCallback(e => {
    e.preventDefault()
    setZoom(z => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  // Pan
  function handleBgMouseDown(e) {
    if (e.button !== 0) return
    setPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }
  function handleMouseMove(e) {
    if (panning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
    }
    if (dragging) {
      const rect = containerRef.current.getBoundingClientRect()
      const nx = (e.clientX - rect.left - pan.x) / zoom
      const ny = (e.clientY - rect.top - pan.y) / zoom
      nodesRef.current = nodesRef.current.map(n =>
        n.id === dragging ? { ...n, x: nx, y: ny, vx: 0, vy: 0 } : n
      )
      setNodes([...nodesRef.current])
    }
  }
  function handleMouseUp() { setPanning(false); setDragging(null) }

  function handleNodeMouseDown(e, id) {
    e.stopPropagation()
    setDragging(id)
  }

  const tagColorMap = Object.fromEntries(tags.map(t => [t.id, t.color]))

  return (
    <div
      className="graph-view"
      ref={containerRef}
      onMouseDown={handleBgMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg className="graph-svg">
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {showLines && edges.map(edge => {
            const na = nodes.find(n => n.id === edge.a)
            const nb = nodes.find(n => n.id === edge.b)
            if (!na || !nb) return null
            const color = tagColorMap[edge.tags[0]] || '#aaa'
            return (
              <line
                key={edge.a + '|' + edge.b}
                x1={na.x} y1={na.y}
                x2={nb.x} y2={nb.y}
                stroke={color}
                strokeWidth={1.5 / zoom}
                strokeOpacity={0.4}
              />
            )
          })}
        </g>
      </svg>

      {/* Nodes (HTML, overlaid) */}
      <div
        className="graph-nodes"
        style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {nodes.map(node => {
          const thumb = getThumb(node.item)
          const nodeTags = tags.filter(t => node.item.tags?.includes(t.id))
          return (
            <motion.div
              key={node.id}
              className={`graph-node ${hoveredNode === node.id ? 'hovered' : ''}`}
              style={{
                left: node.x - NODE_SIZE / 2,
                top: node.y - NODE_SIZE / 2,
                width: NODE_SIZE,
                height: NODE_SIZE,
              }}
              onMouseDown={e => handleNodeMouseDown(e, node.id)}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {thumb ? (
                <img src={thumb} alt="" className="graph-node-img" draggable={false} />
              ) : (
                <div className="graph-node-placeholder">
                  <span>{(node.item.title || node.item.type || '?')[0].toUpperCase()}</span>
                </div>
              )}
              {/* Tag ring */}
              {nodeTags.length > 0 && (
                <div className="graph-node-tags">
                  {nodeTags.slice(0, 3).map(t => (
                    <span key={t.id} className="graph-node-tag-dot" style={{ background: t.color }} />
                  ))}
                </div>
              )}
              {/* Tooltip */}
              {hoveredNode === node.id && node.item.title && (
                <div className="graph-node-tooltip">{node.item.title}</div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Controls */}
      <div className="graph-controls">
        <button onClick={() => setZoom(z => Math.min(3, z + 0.15))}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.15))}>−</button>
        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
      </div>
    </div>
  )
}
