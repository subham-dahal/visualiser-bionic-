import { afterEach, describe, expect, it, vi } from 'vitest'
import portalResult from '../../fixtures/portal-result.json'
import solverCamel from '../../fixtures/solver-camel.json'
import solverSnake from '../../fixtures/solver-snake.json'
import { ApiError, fetchPackingResult } from '../client'
import { NormaliseError } from '../normalise'

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

type MockResponse = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

const okResponse = (body: unknown): MockResponse => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => body,
})

const errorResponse = (status: number, statusText: string, json: () => Promise<unknown>): MockResponse => ({
  ok: false,
  status,
  statusText,
  json,
})

const stubFetch = (impl: (url: string, init?: RequestInit) => Promise<MockResponse>) => {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Request construction: URL and API base resolution
describe('fetchPackingResult request URL', () => {
  it('builds the URL from the apiBase option and orderId', async () => {
    const fetchMock = stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931', { apiBase: 'https://portal.fitlogistics.com.au' })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://portal.fitlogistics.com.au/api/orders/ORD-20931/result')
  })

  it('falls back to VITE_PORTAL_API_BASE when no apiBase is given', async () => {
    vi.stubEnv('VITE_PORTAL_API_BASE', 'http://localhost:4000')
    const fetchMock = stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931')
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:4000/api/orders/ORD-20931/result')
    vi.unstubAllEnvs()
  })

  it('uses a relative URL when an empty apiBase is given', async () => {
    const fetchMock = stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/orders/ORD-20931/result')
  })

  it('passes an AbortSignal to fetch', async () => {
    const fetchMock = stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal)
  })
})

// Successful responses are normalised regardless of which upstream shape they use
describe('fetchPackingResult response normalisation', () => {
  it('passes a portal-shaped body through', async () => {
    stubFetch(async () => okResponse(portalResult))
    const result = await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(result.boxes.map((b) => b.boxId)).toEqual(['Crate-1', 'Crate-2'])
  })

  it('converts a snake_case solver body', async () => {
    stubFetch(async () => okResponse(solverSnake))
    const result = await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(result.boxes[0]?.items.map((i) => i.itemId)).toEqual(['ITEM-A', 'ITEM-B'])
  })

  it('rejects with NormaliseError (not ApiError) for an unrecognised 200 body', async () => {
    stubFetch(async () => okResponse({ orderId: 'ORD-20931', state: 'queued' }))
    const error = await fetchPackingResult('ORD-20931', { apiBase: '' }).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(NormaliseError)
  })

  it('rejects with the JSON parse error when a 200 body is not JSON', async () => {
    stubFetch(async () => ({
      ...okResponse(null),
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON at position 0')
      },
    }))
    await expect(fetchPackingResult('ORD-20931', { apiBase: '' })).rejects.toThrow(SyntaxError)
  })
})

// HTTP error responses become ApiError with the best message available
describe('fetchPackingResult HTTP errors', () => {
  it('uses the error field from a JSON body on 401', async () => {
    stubFetch(async () => errorResponse(401, 'Unauthorized', async () => ({ error: 'Session expired, please sign in again' })))
    const error = (await fetchPackingResult('ORD-20931', { apiBase: '' }).catch((e: unknown) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ApiError')
    expect(error.status).toBe(401)
    expect(error.message).toBe('Session expired, please sign in again')
  })

  it('falls back to statusText when the error body is not JSON (e.g. an nginx 502 page)', async () => {
    stubFetch(async () =>
      errorResponse(502, 'Bad Gateway', async () => {
        throw new SyntaxError('Unexpected token <')
      }),
    )
    const error = (await fetchPackingResult('ORD-20931', { apiBase: '' }).catch((e: unknown) => e)) as ApiError
    expect(error.message).toBe('Bad Gateway')
    expect(error.status).toBe(502)
  })

  it('falls back to statusText when the JSON body has no error field', async () => {
    stubFetch(async () => errorResponse(500, 'Internal Server Error', async () => ({ detail: 'db down' })))
    await expect(fetchPackingResult('ORD-20931', { apiBase: '' })).rejects.toThrow('Internal Server Error')
  })

  it('falls back to statusText when the error field is null', async () => {
    stubFetch(async () => errorResponse(500, 'Internal Server Error', async () => ({ error: null })))
    await expect(fetchPackingResult('ORD-20931', { apiBase: '' })).rejects.toThrow('Internal Server Error')
  })

  it('stringifies a non-string error field', async () => {
    stubFetch(async () => errorResponse(422, 'Unprocessable Entity', async () => ({ error: 4221 })))
    await expect(fetchPackingResult('ORD-20931', { apiBase: '' })).rejects.toThrow('4221')
  })

  it('falls back to statusText when the JSON body is an array', async () => {
    stubFetch(async () => errorResponse(400, 'Bad Request', async () => ['orderId is required']))
    await expect(fetchPackingResult('ORD-20931', { apiBase: '' })).rejects.toThrow('Bad Request')
  })
})

// Network failures and timeouts
describe('fetchPackingResult network failures and timeouts', () => {
  it('rethrows a network error as-is when the request was not aborted', async () => {
    const networkError = new TypeError('Failed to fetch')
    stubFetch(async () => {
      throw networkError
    })
    await expect(fetchPackingResult('ORD-20931', { apiBase: '' })).rejects.toBe(networkError)
  })

  it('times out at a custom timeoutMs and not before', async () => {
    vi.useFakeTimers()
    stubFetch(() => new Promise(() => {}))
    let settled = false
    const promise = fetchPackingResult('ORD-20931', { apiBase: '', timeoutMs: 2000 })
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiError)
    void promise.catch(() => {}).finally(() => (settled = true))

    await vi.advanceTimersByTimeAsync(1999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await assertion
  })

  it('aborts the underlying fetch when the timeout fires', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    stubFetch((_url, init) => {
      signal = init?.signal ?? undefined
      return new Promise(() => {})
    })
    const promise = fetchPackingResult('ORD-20931', { apiBase: '', timeoutMs: 500 })
    void promise.catch(() => {})
    await vi.advanceTimersByTimeAsync(500)
    expect(signal?.aborted).toBe(true)
  })

  it('does not throw an unhandled rejection when fetch rejects after the timeout', async () => {
    vi.useFakeTimers()
    stubFetch(
      (_url, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    const promise = fetchPackingResult('ORD-20931', { apiBase: '', timeoutMs: 100 })
    const assertion = expect(promise).rejects.toBeInstanceOf(ApiError)
    await vi.advanceTimersByTimeAsync(100)
    await assertion
  })

  it('clears the timeout timer after a successful response', async () => {
    vi.useFakeTimers()
    stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears the timeout timer after an HTTP error', async () => {
    vi.useFakeTimers()
    stubFetch(async () => errorResponse(404, 'Not Found', async () => ({ error: 'Order not found' })))
    await fetchPackingResult('ORD-404', { apiBase: '' }).catch(() => {})
    expect(vi.getTimerCount()).toBe(0)
  })
})

// Auth token lookup must never break the request
describe('fetchPackingResult auth token', () => {
  it('sends no Authorization header when localStorage throws (sandboxed iframe)', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    const fetchMock = stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931', { apiBase: '' })
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers).toEqual({})
  })

  it('reads the token from the fitportal.token key', async () => {
    const getItem = vi.fn(() => 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTQyIn0.sig')
    vi.stubGlobal('localStorage', { getItem })
    stubFetch(async () => okResponse(portalResult))
    await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(getItem).toHaveBeenCalledWith('fitportal.token')
  })
})

// Concurrency: parallel requests are independent of each other
describe('fetchPackingResult concurrent requests', () => {
  it('resolves two in-flight requests with their own results', async () => {
    stubFetch(async (url) =>
      url.includes('ORD-A') ? okResponse(portalResult) : okResponse(solverSnake),
    )
    const [a, b] = await Promise.all([
      fetchPackingResult('ORD-A', { apiBase: '' }),
      fetchPackingResult('ORD-B', { apiBase: '' }),
    ])
    expect(a.boxes).toHaveLength(2)
    expect(b.boxes).toHaveLength(1)
  })

  it('lets one request fail without affecting the other', async () => {
    stubFetch(async (url) =>
      url.includes('ORD-A')
        ? errorResponse(404, 'Not Found', async () => ({ error: 'Order not found' }))
        : okResponse(portalResult),
    )
    const [a, b] = await Promise.allSettled([
      fetchPackingResult('ORD-A', { apiBase: '' }),
      fetchPackingResult('ORD-B', { apiBase: '' }),
    ])
    expect(a.status).toBe('rejected')
    expect(b.status).toBe('fulfilled')
  })
})

// Messages shown to the user on the StatusScreen
describe('fetchPackingResult user-facing messages', () => {
  it('uses a generic "Request failed (status)" when there is no statusText and no JSON error', async () => {
    // HTTP/2 responses have an empty statusText, so this is the common case in production
    stubFetch(async () =>
      errorResponse(503, '', async () => {
        throw new SyntaxError('Unexpected token <')
      }),
    )
    const error = (await fetchPackingResult('ORD-20931', { apiBase: '' }).catch((e: unknown) => e)) as ApiError
    expect(error.message).toBe('Request failed (503).')
    expect(error.status).toBe(503)
  })

  it('reports the actual timeout duration, not a hard-coded 8s', async () => {
    vi.useFakeTimers()
    stubFetch(() => new Promise(() => {}))
    const promise = fetchPackingResult('ORD-20931', { apiBase: '', timeoutMs: 2000 })
    const assertion = expect(promise).rejects.toThrow('Request timed out after 2s')
    await vi.advanceTimersByTimeAsync(2000)
    await assertion
  })

  it('unwraps a { result: ... } envelope from Portal', async () => {
    stubFetch(async () => okResponse({ result: portalResult }))
    const result = await fetchPackingResult('ORD-20931', { apiBase: '' })
    expect(result.boxes).toHaveLength(2)
  })
})
