import { useMemo } from 'react'
import Masonry from 'react-masonry-css'
import { motion } from 'framer-motion'
import Card from '../Card/Card'
import './MasonryGrid.css'

const BREAKPOINTS = {
  default: 5,
  1800: 6,
  1400: 5,
  1100: 4,
  800: 3,
  560: 2,
  400: 1,
}

const itemVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 22,
      delay: (i % 20) * 0.04,
    },
  }),
}

function groupItems(items, sort, tags) {
  if (sort === 'mixed') return [{ label: null, items }]

  if (sort === 'cluster') {
    const groups = []
    const tagged = {}
    const untagged = []

    items.forEach(item => {
      if (!item.tags || item.tags.length === 0) {
        untagged.push(item)
      } else {
        // Put item in its first tag's group (primary tag)
        const primaryTag = item.tags[0]
        if (!tagged[primaryTag]) tagged[primaryTag] = []
        tagged[primaryTag].push(item)
      }
    })

    tags.forEach(tag => {
      if (tagged[tag.id]) {
        groups.push({ label: tag.name, color: tag.color, items: tagged[tag.id] })
      }
    })
    if (untagged.length > 0) groups.push({ label: 'Untagged', color: '#999', items: untagged })
    return groups
  }

  if (sort === 'media') {
    const order = ['image', 'gif', 'video', 'youtube', 'spotify', 'iframe', 'text']
    const labels = {
      image: 'Images', gif: 'GIFs', video: 'Video',
      youtube: 'YouTube', spotify: 'Spotify', iframe: 'Embeds', text: 'Text',
    }
    const grouped = {}
    items.forEach(item => {
      const t = item.type || 'image'
      if (!grouped[t]) grouped[t] = []
      grouped[t].push(item)
    })
    return order
      .filter(t => grouped[t]?.length)
      .map(t => ({ label: labels[t] || t, items: grouped[t] }))
  }

  return [{ label: null, items }]
}

export default function MasonryGrid({
  items,
  tags,
  sort,
  zoom,
  adminMode,
  onEdit,
  onDelete,
}) {
  const groups = useMemo(() => groupItems(items, sort, tags), [items, sort, tags])

  return (
    <div
      className="masonry-zoom-wrap"
      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
    >
      {groups.map((group, gi) => (
        <div key={gi} className={`masonry-group ${sort !== 'mixed' ? 'masonry-group-spaced' : ''}`}>
          {group.label && (
            <div className="masonry-group-label">
              {group.color && (
                <span className="masonry-group-dot" style={{ background: group.color }} />
              )}
              {group.label}
            </div>
          )}
          <Masonry
            breakpointCols={BREAKPOINTS}
            className="masonry-grid"
            columnClassName="masonry-col"
          >
            {group.items.map((item, i) => (
              <motion.div
                key={item.id}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '80px' }}
                variants={itemVariants}
                className="masonry-item"
              >
                <Card
                  item={item}
                  tags={tags}
                  adminMode={adminMode}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </Masonry>
        </div>
      ))}

      {items.length === 0 && (
        <div className="masonry-empty">
          <p>No items yet. Add content from the admin panel.</p>
        </div>
      )}
    </div>
  )
}
