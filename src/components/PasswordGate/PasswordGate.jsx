import { useState } from 'react'
import { motion } from 'framer-motion'
import './PasswordGate.css'

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export default function PasswordGate({ hash, onUnlock, storageKey = 'drosboard_unlocked' }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setChecking(true)
    setError(false)
    const h = await hashPassword(pw)
    if (h === hash) {
      sessionStorage.setItem(storageKey, '1')
      onUnlock()
    } else {
      setError(true)
      setPw('')
    }
    setChecking(false)
  }

  return (
    <div className="gate">
      <motion.div
        className="gate-box"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h1 className="gate-title">Dro's Board</h1>
        <p className="gate-sub">Enter password to view</p>
        <form onSubmit={handleSubmit} className="gate-form">
          <input
            className={`gate-input ${error ? 'error' : ''}`}
            type="password"
            placeholder="Password"
            value={pw}
            onChange={e => { setPw(e.target.value); setError(false) }}
            autoFocus
          />
          {error && <p className="gate-error">Incorrect password</p>}
          <button className="gate-btn" type="submit" disabled={!pw || checking}>
            {checking ? '…' : 'Enter'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
