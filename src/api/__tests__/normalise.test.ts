import { describe, expect, it, vi } from 'vitest'
import portalResult from '../../fixtures/portal-result.json'
import solverCamel from '../../fixtures/solver-camel.json'
import solverCamelNodims from '../../fixtures/solver-camel-nodims.json'
import solverSnake from '../../fixtures/solver-snake.json'
import { findOverlaps } from '../geometry'
import { NormaliseError, normalisePackingResult } from '../normalise'

describe('normalisePackingResult', () => {
  it('converts solver-camel.json to two boxes with distinct ids and the expected item counts', () => {
    const result = normalisePackingResult(solverCamel)
    expect(result.boxes).toHaveLength(2)

    const boxIds = result.boxes.map((box) => box.boxId)
    expect(new Set(boxIds).size).toBe(2)
    expect(result.boxes[0]?.items).toHaveLength(8)
    expect(result.boxes[1]?.items).toHaveLength(2)
  })

  it('findOverlaps is empty for both solver-camel.json boxes (axis mapping is identity)', () => {
    const result = normalisePackingResult(solverCamel)
    expect(findOverlaps(result.boxes[0]!.items)).toEqual([])
    expect(findOverlaps(result.boxes[1]!.items)).toEqual([])
  })

  it('converts solver-snake.json using legacy field names into sensible itemIds', () => {
    const result = normalisePackingResult(solverSnake)
    expect(result.boxes).toHaveLength(1)
    expect(result.boxes[0]?.items.map((item) => item.itemId)).toEqual(['ITEM-A', 'ITEM-B'])
  })

  it('derives box dimensions and a generated itemId from solver-camel-nodims.json', () => {
    const result = normalisePackingResult(solverCamelNodims)
    expect(result.boxes).toHaveLength(1)
    const box = result.boxes[0]!
    expect(box.dimensions.width).toBeGreaterThan(0)
    expect(box.dimensions.depth).toBeGreaterThan(0)
    expect(box.dimensions.length).toBeGreaterThan(0)
    expect(box.dimensions).toEqual({ width: 100, depth: 100, length: 100 })
    expect(box.items).toHaveLength(1)
    expect(box.items[0]?.itemId).toBe('item-0')
  })

  it('passes portal-result.json through with item counts and boxIds unchanged', () => {
    const result = normalisePackingResult(portalResult)
    expect(result.boxes.map((box) => box.boxId)).toEqual(['Crate-1', 'Crate-2'])
    expect(result.boxes[0]?.items).toHaveLength(8)
    expect(result.boxes[1]?.items).toHaveLength(2)
  })

  it('throws NormaliseError for an unrecognised object', () => {
    expect(() => normalisePackingResult({ foo: 'bar' })).toThrow(NormaliseError)
  })
})

// Invalid payloads: anything that isn't a recognisable portal or solver shape must throw NormaliseError
describe('normalisePackingResult rejects malformed payloads', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'Internal Server Error'],
    ['a number', 404],
    ['an array', [{ boxId: 'Crate-1' }]],
  ])('throws NormaliseError for %s', (_label, raw) => {
    expect(() => normalisePackingResult(raw)).toThrow(NormaliseError)
    expect(() => normalisePackingResult(raw)).toThrow(/not an object/)
  })

  it('lists the top-level keys it saw in the error message', () => {
    expect(() => normalisePackingResult({ orderId: 'ORD-20931', state: 'queued' })).toThrow(
      'Top-level keys: orderId, state',
    )
  })

  it('reports (none) for an empty object', () => {
    expect(() => normalisePackingResult({})).toThrow('Top-level keys: (none)')
  })

  it('throws when boxes is present but not an array', () => {
    expect(() => normalisePackingResult({ boxes: { boxId: 'Crate-1' } })).toThrow(NormaliseError)
  })

  it('throws with the index of a box that is not an object', () => {
    expect(() =>
      normalisePackingResult({
        status: 'success',
        boxes: [{ boxId: 'Crate-1', dimensions: { width: 1, depth: 1, length: 1 }, items: [] }, 'Crate-2'],
      }),
    ).toThrow('boxes[1] is not an object')
  })

  it.each([
    ['boxId is missing', { dimensions: { width: 600, depth: 300, length: 400 }, items: [] }],
    ['boxId is a number', { boxId: 7, dimensions: { width: 600, depth: 300, length: 400 }, items: [] }],
    ['dimensions is missing', { boxId: 'Crate-1', items: [] }],
    ['dimensions is null', { boxId: 'Crate-1', dimensions: null, items: [] }],
    ['items is not an array', { boxId: 'Crate-1', dimensions: { width: 600, depth: 300, length: 400 }, items: {} }],
  ])('throws when %s', (_label, badBox) => {
    expect(() => normalisePackingResult({ status: 'success', boxes: [badBox] })).toThrow(
      'boxes[0] is missing boxId, dimensions, or items',
    )
  })
})

// Portal payload edge cases
describe('normalisePackingResult portal payloads', () => {
  it('accepts a portal result with zero boxes', () => {
    const result = normalisePackingResult({ status: 'success', source: 'bionic-solver', boxes: [] })
    expect(result.boxes).toEqual([])
    expect(result.status).toBe('success')
  })

  it('keeps extra top-level fields like orderId and solverMs', () => {
    const result = normalisePackingResult({
      status: 'success',
      source: 'bionic-solver',
      orderId: 'ORD-20931',
      solverMs: 142,
      boxes: [],
    })
    expect(result.orderId).toBe('ORD-20931')
    expect(result.solverMs).toBe(142)
  })

  it('disambiguates duplicate portal boxIds', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const box = { boxId: 'Crate', dimensions: { width: 600, depth: 300, length: 400 }, items: [] }
    const result = normalisePackingResult({ status: 'success', boxes: [box, { ...box }] })
    expect(result.boxes.map((b) => b.boxId)).toEqual(['Crate', 'Crate-2'])
    vi.restoreAllMocks()
  })

  it('prefers the portal shape when a payload has both boxes and results', () => {
    const result = normalisePackingResult({
      status: 'success',
      boxes: [{ boxId: 'Portal-Box', dimensions: { width: 1, depth: 1, length: 1 }, items: [] }],
      results: [{ boxReference: 'Solver-Box', placements: [] }],
    })
    expect(result.boxes.map((b) => b.boxId)).toEqual(['Portal-Box'])
  })
})

// Fixture sanity: every item in every fixture sits inside its box with no collisions
describe('fixture packing integrity', () => {
  it.each([
    ['portal-result.json', portalResult],
    ['solver-camel.json', solverCamel],
    ['solver-snake.json', solverSnake],
    ['solver-camel-nodims.json', solverCamelNodims],
  ])('%s has no overlapping items in any box', (_name, fixture) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const box of normalisePackingResult(fixture).boxes) {
      expect(findOverlaps(box.items)).toEqual([])
    }
    vi.restoreAllMocks()
  })

  it('portal-result.json keeps every item inside its box bounds', () => {
    for (const box of normalisePackingResult(portalResult).boxes) {
      for (const item of box.items) {
        expect(item.position.x + item.dimensions.width).toBeLessThanOrEqual(box.dimensions.width)
        expect(item.position.y + item.dimensions.depth).toBeLessThanOrEqual(box.dimensions.depth)
        expect(item.position.z + item.dimensions.length).toBeLessThanOrEqual(box.dimensions.length)
      }
    }
  })
})

// size and bounds tests
describe('normalisePackingResult validates sizes and bounds', () => {
  const portal = (box: unknown) => ({ status: 'success', boxes: [box] })
  const crate = (items: unknown[], dimensions = { width: 600, depth: 300, length: 400 }) => ({
    boxId: 'Crate-1',
    dimensions,
    items,
  })
  const item = (position: { x: number; y: number; z: number }, dimensions = { width: 100, depth: 100, length: 100 }) => ({
    itemId: 'Mug',
    dimensions,
    position,
  })

  it.each([
    ['negative width', { width: -600, depth: 300, length: 400 }, 'invalid width'],
    ['negative depth', { width: 600, depth: -300, length: 400 }, 'invalid depth'],
    ['negative length', { width: 600, depth: 300, length: -400 }, 'invalid length'],
    ['zero width', { width: 0, depth: 300, length: 400 }, 'invalid width'],
    ['NaN depth', { width: 600, depth: Number.NaN, length: 400 }, 'invalid depth'],
  ])('rejects a box with %s', (_label, dimensions, message) => {
    expect(() => normalisePackingResult(portal(crate([], dimensions)))).toThrow(NormaliseError)
    expect(() => normalisePackingResult(portal(crate([], dimensions)))).toThrow(message)
  })

  it('rejects a box still using the old { w, h, d } keys', () => {
    expect(() => normalisePackingResult(portal(crate([], { w: 600, h: 300, d: 400 } as never)))).toThrow(
      'invalid width',
    )
  })

  it('rejects an item with a negative size', () => {
    const bad = item({ x: 0, y: 0, z: 0 }, { width: 100, depth: -50, length: 100 })
    expect(() => normalisePackingResult(portal(crate([bad])))).toThrow('Item "Mug" (#0) in box "Crate-1" has an invalid depth')
  })

  it.each([
    ['x', { x: -10, y: 0, z: 0 }],
    ['y', { x: 0, y: -10, z: 0 }],
    ['z', { x: 0, y: 0, z: -10 }],
  ])('rejects an item starting below 0 on %s', (axis, position) => {
    expect(() => normalisePackingResult(portal(crate([item(position)])))).toThrow(`${axis} = -10 is below 0`)
  })

  it.each([
    ['width', { x: 550, y: 0, z: 0 }, 'x + width = 650 exceeds box width 600'],
    ['depth', { x: 0, y: 250, z: 0 }, 'y + depth = 350 exceeds box depth 300'],
    ['length', { x: 0, y: 0, z: 350 }, 'z + length = 450 exceeds box length 400'],
  ])('rejects an item extending past the box %s', (_axis, position, message) => {
    expect(() => normalisePackingResult(portal(crate([item(position)])))).toThrow(message)
  })

  it('accepts items touching every wall exactly', () => {
    const corners = [item({ x: 0, y: 0, z: 0 }), item({ x: 500, y: 200, z: 300 })]
    expect(normalisePackingResult(portal(crate(corners))).boxes[0]?.items).toHaveLength(2)
  })

  it('tolerates tiny floating point overshoot', () => {
    const nearlyFlush = item({ x: 500.005, y: 0, z: 0 })
    expect(() => normalisePackingResult(portal(crate([nearlyFlush])))).not.toThrow()
  })

  it('collects every problem into NormaliseError.issues', () => {
    const items = [item({ x: -10, y: 0, z: 0 }), item({ x: 0, y: 250, z: 0 })]
    try {
      normalisePackingResult(portal(crate(items)))
      expect.unreachable()
    } catch (err) {
      expect(err).toBeInstanceOf(NormaliseError)
      expect((err as NormaliseError).issues).toHaveLength(2)
      expect((err as NormaliseError).message).toMatch(/^Invalid packing result\. 2 packing problems found/)
    }
  })

  it('also validates solver payloads', () => {
    const solver = {
      results: [
        {
          boxReference: 'BOX-1',
          width: 100,
          length: 100,
          depth: 100,
          placements: [{ itemCode: 'A', x: 80, y: 0, z: 0, width: 50, length: 10, depth: 10 }],
        },
      ],
    }
    expect(() => normalisePackingResult(solver)).toThrow('x + width = 130 exceeds box width 100')
  })
})
