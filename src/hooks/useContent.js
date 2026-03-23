import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

export function useContent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${BASE}data/content.json?t=${Date.now()}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load content')
        return r.json()
      })
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { data, loading, error, setData }
}
