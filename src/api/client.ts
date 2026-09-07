import type { PackingResult } from '../types/packing'
import { normalisePackingResult } from './normalise'

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function fetchPackingResult(
  orderId: string,
  options?: { apiBase?: string; timeoutMs?: number },
): Promise<PackingResult> {
  const url = `${options?.apiBase ?? import.meta.env.VITE_PORTAL_API_BASE ?? ''}/api/orders/${orderId}/result`
  const timeoutMs = options?.timeoutMs ?? 8000

  const token = (() => {
    try {
      return localStorage.getItem('fitportal.token')
    } catch {
      return null
    }
  })()

  const headers: Record<string, string> = {}
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`
  }

  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new ApiError('Request timed out after 8s'))
    }, timeoutMs)
  })

  try {
    const fetchPromise = fetch(url, {
      signal: controller.signal,
      headers,
    })
    void fetchPromise.catch(() => {
      // Swallow late abort/network rejection after Promise.race has settled.
    })

    const res = await Promise.race([fetchPromise, timeoutPromise])

    if (!res.ok) {
      let message = res.statusText
      try {
        const data: unknown = await res.json()
        if (
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          (data as { error: unknown }).error != null
        ) {
          message = String((data as { error: unknown }).error)
        }
      } catch {
        // Fall back to HTTP status text when the body is not JSON.
      }
      throw new ApiError(message, res.status)
    }

    const body: unknown = await res.json()
    return normalisePackingResult(body)
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (controller.signal.aborted) {
      throw new ApiError('Request timed out after 8s')
    }
    throw err
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
