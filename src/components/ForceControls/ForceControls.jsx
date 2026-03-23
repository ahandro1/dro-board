import { motion, AnimatePresence } from 'framer-motion'
import './ForceControls.css'

// Obsidian-style force controls panel
export default function ForceControls({ visible, forces, onChange }) {
  if (!visible) return null

  function set(key, val) {
    onChange({ ...forces, [key]: parseFloat(val) })
  }

  const sliders = [
    {
      key: 'centerStrength',
      label: 'Center force',
      min: 0, max: 0.3, step: 0.005,
      display: v => v.toFixed(3),
      value: forces.centerStrength,
    },
    {
      key: 'repelStrength',
      label: 'Repel force',
      min: -800, max: -50, step: 10,
      display: v => Math.abs(Math.round(v)),
      value: forces.repelStrength,
    },
    {
      key: 'linkStrength',
      label: 'Link force',
      min: 0, max: 1, step: 0.01,
      display: v => v.toFixed(2),
      value: forces.linkStrength,
    },
    {
      key: 'linkDistance',
      label: 'Link distance',
      min: 40, max: 600, step: 10,
      display: v => Math.round(v),
      value: forces.linkDistance,
    },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="force-controls"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="force-controls__header">Forces</div>
          {sliders.map(s => (
            <div key={s.key} className="force-controls__row">
              <div className="force-controls__label-row">
                <span className="force-controls__label">{s.label}</span>
                <span className="force-controls__value">{s.display(s.value)}</span>
              </div>
              <input
                type="range"
                min={s.min} max={s.max} step={s.step}
                value={s.value}
                onChange={e => set(s.key, e.target.value)}
                className="force-controls__slider"
              />
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
