import {
  forceSimulation,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
} from 'd3-force'

export const CARD_DIMS = {
  image:    { w: 260, h: 220 },
  gif:      { w: 260, h: 220 },
  video:    { w: 320, h: 200 },
  youtube:  { w: 320, h: 200 },
  spotify:  { w: 300, h: 100 },
  iframe:   { w: 380, h: 280 },
  website:  { w: 380, h: 280 },
  text:     { w: 260, h: 150 },
}

export function getCardDims(item) {
  const base = CARD_DIMS[item.type] || { w: 260, h: 220 }
  const scale = item.scale || 1
  return { w: base.w * scale, h: base.h * scale }
}

// Expand panel dimensions — must match Card.css card-expand-right / card-expand-bottom
const EXPAND_RIGHT_W = 260 + 12   // panel width + gap
const EXPAND_BOTTOM_H = 100 + 10  // estimated panel height + gap
const EXPAND_PAD = 24             // breathing room around the zone

// Push a node (with .x, .y, .r) outside the given axis-aligned zone.
// Uses the minimum-overlap axis so movement is as small as possible.
function pushOutOfZone(node, xMin, xMax, yMin, yMax) {
  const r = node.r
  if (node.x + r <= xMin || node.x - r >= xMax) return
  if (node.y + r <= yMin || node.y - r >= yMax) return

  const ol = (node.x + r) - xMin   // overlap left side
  const or_ = xMax - (node.x - r)  // overlap right side
  const ot = (node.y + r) - yMin   // overlap top
  const ob = yMax - (node.y - r)   // overlap bottom

  const min = Math.min(ol, or_, ot, ob)
  if (min === ol)  node.x = xMin - r - 6
  else if (min === or_) node.x = xMax + r + 6
  else if (min === ot)  node.y = yMin - r - 6
  else                  node.y = yMax + r + 6
}

// ─── Main layout calculator ──────────────────────────────────────────────────
// modes: 'all' | 'cluster' | 'type' | 'filter' | 'focus'
export function calculateLayout(items, mode, activeId, forces, currentPositions = {}) {
  if (!items || items.length === 0) return {}

  const { centerStrength = 0.12, repelStrength = -150, linkStrength = 0.3 } = forces

  // Pinned items that always stay fixed (allowOverlap = true, or non-focus modes)
  // Pinned items without allowOverlap temporarily join simulation in focus mode
  const alwaysFixed = items.filter(i => i.pinned && (i.allowOverlap || mode !== 'focus'))
  const tempUnpinned = items.filter(i => i.pinned && !i.allowOverlap && mode === 'focus')
  const unpinned = items.filter(i => !i.pinned)

  const nodeItems = [...unpinned, ...tempUnpinned]

  const nodes = nodeItems.map(item => {
    const dims = getCardDims(item)
    const cur = currentPositions[item.id]
    return {
      id: item.id,
      x: cur != null ? cur.x : (Math.random() - 0.5) * 500,
      y: cur != null ? cur.y : (Math.random() - 0.5) * 500,
      w: dims.w,
      h: dims.h,
      r: Math.sqrt(dims.w ** 2 + dims.h ** 2) / 2 + 16,
      tags: item.tags || [],
      type: item.type,
      dateAdded: item.dateAdded || '2000-01-01',
    }
  })

  const sim = forceSimulation(nodes)
    .force('charge', forceManyBody().strength(repelStrength))
    .force('collision', forceCollide().radius(d => d.r).strength(0.85))

  // ── 'all' mode: recent items toward center ──────────────────────────────
  if (mode === 'all') {
    const sorted = [...nodes].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
    const recencyMap = {}
    sorted.forEach((n, i) => {
      recencyMap[n.id] = 1 - (i / Math.max(sorted.length - 1, 1)) * 0.65
    })
    sim.force('center', forceCenter(0, 0).strength(centerStrength))
    sim.force('cx', forceX(0).strength(d => centerStrength * recencyMap[d.id] * 1.5))
    sim.force('cy', forceY(0).strength(d => centerStrength * recencyMap[d.id] * 1.5))

  // ── 'cluster' mode ───────────────────────────────────────────────────────
  } else if (mode === 'cluster') {
    const allTagIds = [...new Set(items.flatMap(i => i.tags || []))]
    const untaggedCount = items.filter(i => !i.tags || i.tags.length === 0).length
    const groups = untaggedCount > 0 ? [...allTagIds, '__untagged__'] : allTagIds
    const count = Math.max(groups.length, 1)
    const clusterRadius = Math.max(520, count * 150)
    const centers = {}
    groups.forEach((id, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      centers[id] = { x: Math.cos(angle) * clusterRadius, y: Math.sin(angle) * clusterRadius }
    })
    sim.force('cx', forceX(d => {
      const key = d.tags.length > 0 ? d.tags[0] : '__untagged__'
      return centers[key]?.x ?? 0
    }).strength(linkStrength))
    sim.force('cy', forceY(d => {
      const key = d.tags.length > 0 ? d.tags[0] : '__untagged__'
      return centers[key]?.y ?? 0
    }).strength(linkStrength))
    sim.force('center', forceCenter(0, 0).strength(0.008))

  // ── 'type' mode ──────────────────────────────────────────────────────────
  } else if (mode === 'type') {
    const types = [...new Set(items.map(i => i.type))]
    const count = Math.max(types.length, 1)
    const typeRadius = Math.max(480, count * 140)
    const centers = {}
    types.forEach((type, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      centers[type] = { x: Math.cos(angle) * typeRadius, y: Math.sin(angle) * typeRadius }
    })
    sim.force('cx', forceX(d => centers[d.type]?.x ?? 0).strength(linkStrength))
    sim.force('cy', forceY(d => centers[d.type]?.y ?? 0).strength(linkStrength))
    sim.force('center', forceCenter(0, 0).strength(0.008))

  // ── 'filter' mode ────────────────────────────────────────────────────────
  } else if (mode === 'filter' && activeId) {
    sim.force('fx', forceX(d => {
      if (d.tags.includes(activeId)) return 0
      const angle = Math.atan2(d.y || 1, d.x || 1)
      return Math.cos(angle) * 6000
    }).strength(d => d.tags.includes(activeId) ? 0.5 : 0.9))
    sim.force('fy', forceY(d => {
      if (d.tags.includes(activeId)) return 0
      const angle = Math.atan2(d.y || 1, d.x || 1)
      return Math.sin(angle) * 6000
    }).strength(d => d.tags.includes(activeId) ? 0.5 : 0.9))

  // ── 'focus' mode ─────────────────────────────────────────────────────────
  } else if (mode === 'focus' && activeId) {
    const focusedNode = nodes.find(n => n.id === activeId)
    const focusedTags = focusedNode?.tags || []

    sim.force('fx', forceX(d => {
      if (d.id === activeId) return 0
      const isConnected = d.tags.some(t => focusedTags.includes(t))
      const angle = Math.atan2(d.y || 1, d.x || 0.001)
      return Math.cos(angle) * (isConnected ? 380 : 420)
    }).strength(d => {
      if (d.id === activeId) return 1
      return d.tags.some(t => focusedTags.includes(t)) ? 0.4 : 0.12
    }))
    sim.force('fy', forceY(d => {
      if (d.id === activeId) return 0
      const isConnected = d.tags.some(t => focusedTags.includes(t))
      const angle = Math.atan2(d.y || 1, d.x || 0.001)
      return Math.sin(angle) * (isConnected ? 380 : 420)
    }).strength(d => {
      if (d.id === activeId) return 1
      return d.tags.some(t => focusedTags.includes(t)) ? 0.4 : 0.12
    }))
  }

  sim.tick(250)
  sim.stop()

  // ── Focus mode: push all cards out of the expand panel zone ────────────────
  if (mode === 'focus' && activeId) {
    const fn = nodes.find(n => n.id === activeId)
    if (fn) {
      const xMin = -fn.w / 2 - EXPAND_PAD
      const xMax =  fn.w / 2 + EXPAND_RIGHT_W + EXPAND_PAD
      const yMin = -fn.h / 2 - EXPAND_PAD
      const yMax =  fn.h / 2 + EXPAND_BOTTOM_H + EXPAND_PAD

      // Multiple passes to handle cascading — if card A pushes card B into card C
      for (let pass = 0; pass < 4; pass++) {
        nodes.forEach(n => {
          if (n.id === activeId) return
          pushOutOfZone(n, xMin, xMax, yMin, yMax)
        })
      }
    }
  }

  const positions = {}
  nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y } })

  // Add always-fixed pinned items
  alwaysFixed.forEach(item => {
    positions[item.id] = {
      x: item.pinnedX ?? (currentPositions[item.id]?.x ?? 0),
      y: item.pinnedY ?? (currentPositions[item.id]?.y ?? 0),
    }
  })

  return positions
}

// Explode all items outward from current positions (filter animation phase 1)
export function explodePositions(currentPositions) {
  const exploded = {}
  Object.keys(currentPositions).forEach(id => {
    const { x, y } = currentPositions[id]
    const dist = Math.sqrt(x ** 2 + y ** 2) || 50
    const scale = (dist + 2200) / dist
    exploded[id] = { x: x * scale, y: y * scale }
  })
  return exploded
}
