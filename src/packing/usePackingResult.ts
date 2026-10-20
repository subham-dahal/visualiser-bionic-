import { useEffect, useMemo, useState } from 'react'
import type { PackingResult } from '../types/packing'
import { DEMO_RESULT } from '../demo/demoResult'
import { fetchPackingResult } from '../api/client'
import { normalisePackingResult } from '../api/normalise'

type FetchState = { key: string; result: PackingResult | null; error: string }

// Uses the host's result if given, otherwise fetches by orderId, otherwise falls back to the demo scene.
// Only the fetched response lives in state; everything else is derived during render, so a host result
// or a cleared orderId takes effect immediately and never leaves `loading` stuck.
export function usePackingResult(resultProp: PackingResult | Record<string, unknown> | undefined, orderId: string | undefined, apiBase: string) {
  const [fetched, setFetched] = useState<FetchState | null>(null)
  const shouldFetch = !resultProp && !!orderId
  const key = `${apiBase}|${orderId ?? ''}`

  useEffect(() => {
    if (!shouldFetch || !orderId) return
    let cancelled = false
    fetchPackingResult(orderId, { apiBase }).then(
      (result) => {
        if (!cancelled) setFetched({ key, result, error: '' })
      },
      (err: unknown) => {
        if (!cancelled) setFetched({ key, result: null, error: err instanceof Error ? err.message : String(err) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [shouldFetch, orderId, apiBase, key])

  // Host data (e.g. FitPortal's `result` prop) goes through the same normaliser as fetched data,
  // so Portal's { w, h, d } dimensions and raw solver output both render.
  const host = useMemo(() => {
    if (!resultProp) return null
    try {
      return { result: normalisePackingResult(resultProp), error: '' }
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : String(err) }
    }
  }, [resultProp])

  if (host) return { ...host, loading: false }
  if (!orderId) return { result: DEMO_RESULT, loading: false, error: '' }

  // Ignore a response that belongs to a previous orderId/apiBase
  const current = fetched?.key === key ? fetched : null
  return { result: current?.result ?? null, loading: current === null, error: current?.error ?? '' }
}
