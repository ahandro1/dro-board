import { useState, useEffect, useCallback } from 'react'

const BASE = import.meta.env.BASE_URL
const STORAGE_KEY = 'drosboard_content'

export function useContent() {
  const [data, setDataRaw] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setDataRaw(JSON.parse(saved))
        setLoading(false)
        return
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    fetch(`${BASE}data/content.json?t=${Date.now()}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load content')
        return r.json()
      })
      .then(json => {
        setDataRaw(json)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const setData = useCallback((updater) => {
    setDataRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  return { data, loading, error, setData }
}
