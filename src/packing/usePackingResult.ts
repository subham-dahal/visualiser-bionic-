import { useEffect, useState } from 'react'
import type { PackingResult } from '../types/packing'
import { DEMO_RESULT } from '../demo/demoResult'

async function fetchResult(path: string) {
  let token: string | null = null
  try {
    token = localStorage.getItem('fitportal.token')
  } catch {
    // storage can be unavailable (private mode, sandboxed embed) - fall back to no auth
  }
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`)
  return (data.result ?? data) as PackingResult
}

// Uses the host's result if given, otherwise fetches by orderId, otherwise falls back to the demo scene
export function usePackingResult(resultProp: PackingResult | undefined, orderId: string | undefined, apiBase: string) {
  const [result, setResult] = useState<PackingResult | null>(resultProp ?? null)
  const [loading, setLoading] = useState(!resultProp && !!orderId)
  const [error, setError] = useState('')

  useEffect(() => {
    if (resultProp) {
      setResult(resultProp)
      return
    }
    if (!orderId) {
      setResult(DEMO_RESULT)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetchResult(`${apiBase}/api/orders/${orderId}/result`)
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [resultProp, orderId, apiBase])

  return { result, loading, error }
}
