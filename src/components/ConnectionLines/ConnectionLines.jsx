import { useMemo } from 'react'
import { createPortal } from 'react-dom'

// Renders SVG lines between cards that share tags.
// Lines are injected into the #lines-layer <g> which lives inside InfiniteCanvas's
// SVG and already has the correct pan/zoom transform applied.
export default function ConnectionLines({ items, tags, positions, hoveredId, visible }) {
  const lines = useMemo(() => {
    if (!visible || !items || items.length === 0) return []
    const result = []
    const seen = new Set()

    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        const sharedTags = (a.tags || []).filter(t => (b.tags || []).includes(t))
        if (sharedTags.length === 0) continue

        const key = [a.id, b.id].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)

        const posA = positions[a.id]
        const posB = positions[b.id]
        if (!posA || !posB) continue

        const tagColor = tags.find(t => t.id === sharedTags[0])?.color || '#aaa'
        const isActive = hoveredId && (a.id === hoveredId || b.id === hoveredId)

        result.push({ key, x1: posA.x, y1: posA.y, x2: posB.x, y2: posB.y, color: tagColor, isActive })
      }
    }
    return result
  }, [items, positions, hoveredId, visible, tags])

  if (!visible || lines.length === 0) return null

  // Portal into the SVG <g> that's already transformed with the canvas
  const linesLayer = document.getElementById('lines-layer')
  if (!linesLayer) return null

  return createPortal(
    <>
      {lines.map(line => (
        <line
          key={line.key}
          x1={line.x1} y1={line.y1}
          x2={line.x2} y2={line.y2}
          stroke={line.isActive ? line.color : 'rgba(160,160,160,0.4)'}
          strokeWidth={line.isActive ? 1.8 : 0.9}
          strokeDasharray={line.isActive ? 'none' : '5 5'}
          style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
        />
      ))}
    </>,
    linesLayer
  )
}
