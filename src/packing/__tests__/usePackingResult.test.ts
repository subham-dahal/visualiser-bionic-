// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_RESULT } from '../../demo/demoResult'
import portalResult from '../../fixtures/portal-result.json'
import type { PackingResult } from '../../types/packing'
import { usePackingResult } from '../usePackingResult'

const PORTAL = portalResult as PackingResult
const API_BASE = 'https://portal.fitlogistics.com.au'

const hostResult: PackingResult = {
  status: 'success',
  source: 'bionic-solver',
  orderId: 'ORD-31007',
  boxes: [
    {
      boxId: 'Satchel-M',
      dimensions: { w: 400, h: 100, d: 300 },
      items: [{ itemId: 'Hoodie', dimensions: { w: 350, h: 60, d: 280 }, position: { x: 0, y: 0, z: 0 } }],
    },
  ],
}

type Deferred = { resolve: (res: Partial<Response>) => void; reject: (err: unknown) => void }

const jsonResponse = (status: number, body: unknown): Partial<Response> => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
})

// Returns a fetch mock whose responses are resolved manually, so tests control ordering
const deferredFetch = () => {
  const pending: Deferred[] = []
  const fetchMock = vi.fn(
    () =>
      new Promise<Partial<Response>>((resolve, reject) => {
        pending.push({ resolve, reject })
      }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, pending }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// Source priority: host-provided result > fetch by orderId > demo scene
describe('usePackingResult source selection', () => {
  it('uses the host result immediately without fetching', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => usePackingResult(hostResult, 'ORD-31007', API_BASE))
    expect(result.current).toEqual({ result: hostResult, loading: false, error: '' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to the demo scene when there is no result and no orderId', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => usePackingResult(undefined, undefined, API_BASE))
    expect(result.current.result).toBe(DEMO_RESULT)
    expect(result.current.loading).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('treats an empty-string orderId as no orderId', () => {
    vi.stubGlobal('fetch', vi.fn())
    const { result } = renderHook(() => usePackingResult(undefined, '', API_BASE))
    expect(result.current.result).toBe(DEMO_RESULT)
  })
})

// Fetching by orderId: loading state, URL, success and the { result } envelope
describe('usePackingResult fetching', () => {
  it('starts loading on first render, then exposes the fetched result', async () => {
    const { fetchMock, pending } = deferredFetch()
    const { result } = renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))

    expect(result.current).toEqual({ result: null, loading: true, error: '' })
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/api/orders/ORD-20931/result`, expect.anything())

    await act(async () => pending[0]!.resolve(jsonResponse(200, PORTAL)))
    expect(result.current).toEqual({ result: PORTAL, loading: false, error: '' })
  })

  it('unwraps a { result: ... } envelope from the API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { result: PORTAL })))
    const { result } = renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.result).toEqual(PORTAL)
  })

  it('sends a Bearer token when one is stored', async () => {
    localStorage.setItem('fitportal.token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTQyIn0.sig')
    const fetchMock = vi.fn(async () => jsonResponse(200, PORTAL))
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTQyIn0.sig' },
    })
  })

  it('sends no headers when no token is stored', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, PORTAL))
    vi.stubGlobal('fetch', fetchMock)
    renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { headers: undefined })
  })

  it('still fetches without auth when localStorage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    })
    const fetchMock = vi.fn(async () => jsonResponse(200, PORTAL))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    await waitFor(() => expect(result.current.result).toEqual(PORTAL))
    expect(fetchMock).toHaveBeenCalledWith(expect.any(String), { headers: undefined })
  })
})

// Error states surfaced to the StatusScreen
describe('usePackingResult errors', () => {
  it('surfaces the API error message on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, { error: 'Order ORD-99999 not found' })))
    const { result } = renderHook(() => usePackingResult(undefined, 'ORD-99999', API_BASE))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Order ORD-99999 not found')
    expect(result.current.result).toBeNull()
  })

  it('uses a generic message with the status code when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => {
          throw new SyntaxError('Unexpected token <')
        },
      })),
    )
    const { result } = renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    await waitFor(() => expect(result.current.error).toBe('Request failed (503).'))
  })

  it('surfaces a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    const { result } = renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    await waitFor(() => expect(result.current.error).toBe('Failed to fetch'))
    expect(result.current.loading).toBe(false)
  })

  it('clears a previous error when a new orderId is fetched', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, { error: 'Order ORD-99999 not found' }))
      .mockResolvedValueOnce(jsonResponse(200, PORTAL))
    vi.stubGlobal('fetch', fetchMock)
    const { result, rerender } = renderHook(({ id }) => usePackingResult(undefined, id, API_BASE), {
      initialProps: { id: 'ORD-99999' },
    })
    await waitFor(() => expect(result.current.error).not.toBe(''))

    rerender({ id: 'ORD-20931' })
    await waitFor(() => expect(result.current.result).toEqual(PORTAL))
    expect(result.current.error).toBe('')
  })
})

// Race conditions: stale responses must never overwrite newer state
describe('usePackingResult async ordering', () => {
  it('ignores a slow response for a previous orderId', async () => {
    const { pending } = deferredFetch()
    const { result, rerender } = renderHook(({ id }) => usePackingResult(undefined, id, API_BASE), {
      initialProps: { id: 'ORD-OLD' },
    })
    rerender({ id: 'ORD-NEW' })
    expect(pending).toHaveLength(2)

    await act(async () => pending[1]!.resolve(jsonResponse(200, hostResult)))
    await act(async () => pending[0]!.resolve(jsonResponse(200, PORTAL)))

    expect(result.current.result).toEqual(hostResult)
    expect(result.current.loading).toBe(false)
  })

  it('ignores a late error for a previous orderId', async () => {
    const { pending } = deferredFetch()
    const { result, rerender } = renderHook(({ id }) => usePackingResult(undefined, id, API_BASE), {
      initialProps: { id: 'ORD-OLD' },
    })
    rerender({ id: 'ORD-NEW' })
    await act(async () => pending[1]!.resolve(jsonResponse(200, PORTAL)))
    await act(async () => pending[0]!.reject(new TypeError('Failed to fetch')))

    expect(result.current.error).toBe('')
    expect(result.current.result).toEqual(PORTAL)
  })

  it('does not update state after unmount', async () => {
    const { pending } = deferredFetch()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => usePackingResult(undefined, 'ORD-20931', API_BASE))
    unmount()
    await act(async () => pending[0]!.resolve(jsonResponse(200, PORTAL)))
    expect(result.current.result).toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('refetches when apiBase changes', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, PORTAL))
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = renderHook(({ base }) => usePackingResult(undefined, 'ORD-20931', base), {
      initialProps: { base: API_BASE },
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    rerender({ base: 'http://localhost:4000' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:4000/api/orders/ORD-20931/result', expect.anything())
  })

  it('switches to a host result that arrives later', async () => {
    deferredFetch()
    const { result, rerender } = renderHook(
      ({ res }: { res?: PackingResult }) => usePackingResult(res, 'ORD-20931', API_BASE),
      { initialProps: {} },
    )
    rerender({ res: hostResult })
    expect(result.current.result).toEqual(hostResult)
  })

  // BUG: if a host result (or no orderId) replaces an in-flight fetch, the cancelled
  // request never clears `loading`, so App.tsx stays on "Loading packing result…".
  // Marked as expected-to-fail; remove `.fails` once usePackingResult resets loading.
  it.fails('clears loading when a host result replaces an in-flight fetch', async () => {
    const { pending } = deferredFetch()
    const { result, rerender } = renderHook(
      ({ res }: { res?: PackingResult }) => usePackingResult(res, 'ORD-20931', API_BASE),
      { initialProps: {} },
    )
    rerender({ res: hostResult })
    await act(async () => pending[0]!.resolve(jsonResponse(200, PORTAL)))
    expect(result.current.loading).toBe(false)
  })
})
