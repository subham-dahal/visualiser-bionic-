import { afterEach, describe, expect, it, vi } from 'vitest'
import solverCamel from '../../fixtures/solver-camel.json'
import { ApiError, fetchPackingResult } from '../client'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchPackingResult', () => {
  it('resolves to a PackingResult with status success and 2 boxes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => solverCamel,
      })),
    )

    const result = await fetchPackingResult('order-1')
    expect(result.status).toBe('success')
    expect(result.boxes).toHaveLength(2)
  })

  it('rejects with ApiError when the response is 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Order not found' }),
      })),
    )

    const error = await fetchPackingResult('missing').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toContain('Order not found')
    expect((error as ApiError).status).toBe(404)
  })

  it('rejects with ApiError when the request times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )

    const promise = fetchPackingResult('order-1')
    const assertion = expect(promise).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.message.includes('timed out'),
    )
    await vi.advanceTimersByTimeAsync(8000)
    await assertion
  })

  it('sends Authorization Bearer token when localStorage has fitportal.token', async () => {
    const fetchMock = vi.fn<
      (url: string, init?: RequestInit) => Promise<{
        ok: boolean
        status: number
        statusText: string
        json: () => Promise<unknown>
      }>
    >()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => solverCamel,
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'fitportal.token' ? 'test-token-123' : null),
    })

    await fetchPackingResult('order-1')

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token-123' }),
      }),
    )
  })

  it('omits Authorization header when localStorage has no token', async () => {
    const fetchMock = vi.fn<
      (url: string, init?: RequestInit) => Promise<{
        ok: boolean
        status: number
        statusText: string
        json: () => Promise<unknown>
      }>
    >()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => solverCamel,
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', {
      getItem: () => null,
    })

    await fetchPackingResult('order-1')

    expect(fetchMock).toHaveBeenCalled()
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string> | undefined
    expect(headers?.Authorization).toBeUndefined()
  })
})
