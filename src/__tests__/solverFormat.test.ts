import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fromSolverOutput, uniquifyBoxIds, type SolverOutput } from '../solverFormat'
import type { PackedBox } from '../types/packing'

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

const box = (boxId: string): PackedBox => ({
  boxId,
  dimensions: { w: 600, h: 400, d: 300 },
  items: [],
})

// uniquifyBoxIds: every boxId in a result must be unique because App.tsx uses it as a React key
describe('uniquifyBoxIds', () => {
  it('returns the same box objects untouched when all ids are already unique', () => {
    const boxes = [box('Crate-Small'), box('Crate-Large')]
    const result = uniquifyBoxIds(boxes)
    expect(result[0]).toBe(boxes[0])
    expect(result[1]).toBe(boxes[1])
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('returns an empty array for no boxes', () => {
    expect(uniquifyBoxIds([])).toEqual([])
  })

  it('suffixes the second and third duplicates with -2 and -3', () => {
    const result = uniquifyBoxIds([box('Crate'), box('Crate'), box('Crate')])
    expect(result.map((b) => b.boxId)).toEqual(['Crate', 'Crate-2', 'Crate-3'])
    expect(warnSpy).toHaveBeenCalledTimes(2)
  })

  it('skips a suffix that is already taken by a real box', () => {
    const result = uniquifyBoxIds([box('Crate'), box('Crate-2'), box('Crate')])
    expect(result.map((b) => b.boxId)).toEqual(['Crate', 'Crate-2', 'Crate-3'])
  })

  it('does not mutate the original duplicate box', () => {
    const duplicate = box('Pallet-EU')
    const result = uniquifyBoxIds([box('Pallet-EU'), duplicate])
    expect(duplicate.boxId).toBe('Pallet-EU')
    expect(result[1]).not.toBe(duplicate)
    expect(result[1]?.dimensions).toEqual(duplicate.dimensions)
  })
})

// fromSolverOutput: field-name variants (camelCase / snake_case) and axis mapping
describe('fromSolverOutput field mapping', () => {
  it('maps a camelCase placement to position pass-through and dims {w: width, h: depth, d: length}', () => {
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'MED-BOX',
          width: 400,
          length: 300,
          depth: 250,
          placements: [
            { itemCode: 'SKU-MUG-350', x: 10, y: 20, z: 30, width: 90, length: 80, depth: 110 },
          ],
        },
      ],
    })

    const packed = result.boxes[0]!
    expect(packed.boxId).toBe('MED-BOX')
    expect(packed.dimensions).toEqual({ w: 400, h: 250, d: 300 })
    expect(packed.items[0]).toEqual({
      itemId: 'SKU-MUG-350',
      dimensions: { w: 90, h: 110, d: 80 },
      position: { x: 10, y: 20, z: 30 },
    })
    expect(packed.items[0]).not.toHaveProperty('rotation')
  })

  it('reads snake_case box_reference and outer_* dimensions', () => {
    const result = fromSolverOutput({
      results: [
        {
          box_reference: 'LRG-BOX',
          outer_width: 600,
          outer_length: 400,
          outer_depth: 350,
          placements: [{ item_code: 'SKU-KETTLE', x: 0, y: 0, z: 0, width: 250, length: 250, depth: 300 }],
        },
      ],
    })
    expect(result.boxes[0]?.boxId).toBe('LRG-BOX')
    expect(result.boxes[0]?.dimensions).toEqual({ w: 600, h: 350, d: 400 })
    expect(result.boxes[0]?.items[0]?.itemId).toBe('SKU-KETTLE')
  })

  it('prefers itemCode over item_code over itemReference over item_reference', () => {
    const base = { x: 0, y: 0, z: 0, width: 50, length: 50, depth: 50 }
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'SML',
          width: 200,
          length: 200,
          depth: 200,
          placements: [
            { ...base, itemCode: 'A', item_code: 'B', itemReference: 'C', item_reference: 'D' },
            { ...base, item_code: 'B', itemReference: 'C', item_reference: 'D' },
            { ...base, itemReference: 'C', item_reference: 'D' },
            { ...base, item_reference: 'D' },
          ],
        },
      ],
    })
    expect(result.boxes[0]?.items.map((i) => i.itemId)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('accepts an empty-string itemCode rather than falling through to a generated id', () => {
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'SML',
          placements: [{ itemCode: '', item_code: 'SKU-BOOK', x: 0, y: 0, z: 0, width: 1, length: 1, depth: 1 }],
        },
      ],
    })
    expect(result.boxes[0]?.items[0]?.itemId).toBe('')
  })

  it('generates item-<index> and warns when a placement has no id field', () => {
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'SML',
          placements: [
            { itemCode: 'SKU-PEN', x: 0, y: 0, z: 0, width: 10, length: 150, depth: 10 },
            { x: 10, y: 0, z: 0, width: 10, length: 150, depth: 10 },
          ],
        },
      ],
    })
    expect(result.boxes[0]?.items[1]?.itemId).toBe('item-1')
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('generated "item-1"'))
  })

  it('generates box-<index> when the box has no reference', () => {
    const result = fromSolverOutput({
      results: [
        { boxReference: 'SML', placements: [] },
        { placements: [] },
      ],
    })
    expect(result.boxes.map((b) => b.boxId)).toEqual(['SML', 'box-1'])
  })
})

// Box dimensions: use outer dims when all three are present, otherwise derive from placements
describe('fromSolverOutput box dimensions', () => {
  it('derives dims from the furthest placement extents when box dims are all zero', () => {
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'Crate',
          width: 0,
          length: 0,
          depth: 0,
          placements: [
            { itemCode: 'SKU-A', x: 0, y: 0, z: 0, width: 200, length: 100, depth: 150 },
            { itemCode: 'SKU-B', x: 200, y: 150, z: 50, width: 300, length: 250, depth: 100 },
          ],
        },
      ],
    })
    // w = max(x + width) = 500, h = max(y + depth) = 250, d = max(z + length) = 300
    expect(result.boxes[0]?.dimensions).toEqual({ w: 500, h: 250, d: 300 })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Derived dimensions for box "Crate"'))
  })

  it('derives dims when only some outer dims are present', () => {
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'Partial',
          width: 400,
          length: 300,
          placements: [{ itemCode: 'SKU-A', x: 0, y: 0, z: 0, width: 120, length: 80, depth: 60 }],
        },
      ],
    })
    expect(result.boxes[0]?.dimensions).toEqual({ w: 120, h: 60, d: 80 })
  })

  it('mixes camelCase and outer_* dims per axis', () => {
    const result = fromSolverOutput({
      results: [
        {
          boxReference: 'Mixed',
          width: 0,
          outer_width: 500,
          length: 350,
          outer_depth: 220,
          placements: [],
        },
      ],
    })
    expect(result.boxes[0]?.dimensions).toEqual({ w: 500, h: 220, d: 350 })
  })

  it('yields zero dims for a box with no placements and no dims', () => {
    const result = fromSolverOutput({ results: [{ boxReference: 'Empty', placements: [] }] })
    expect(result.boxes[0]?.dimensions).toEqual({ w: 0, h: 0, d: 0 })
    expect(result.boxes[0]?.items).toEqual([])
  })

  it('treats a missing placements array as empty', () => {
    const raw = { results: [{ boxReference: 'NoPlacements', width: 10, length: 10, depth: 10 }] }
    const result = fromSolverOutput(raw as unknown as SolverOutput)
    expect(result.boxes[0]?.items).toEqual([])
  })
})

// Result status: success vs error when nothing could be packed
describe('fromSolverOutput status', () => {
  it('returns success with unpacked items listed when some boxes were packed', () => {
    const result = fromSolverOutput({
      results: [{ boxReference: 'SML', width: 100, length: 100, depth: 100, placements: [] }],
      failed: ['SKU-SURFBOARD'],
    })
    expect(result.status).toBe('success')
    expect(result.source).toBe('bionic-solver')
    expect(result.unpacked).toEqual(['SKU-SURFBOARD'])
  })

  it('returns error with a count message when no boxes were packed and items failed', () => {
    const result = fromSolverOutput({ results: [], failed: ['SKU-SURFBOARD', 'SKU-PIANO'] })
    expect(result.status).toBe('error')
    expect(result.message).toBe('Solver returned no packed boxes (2 unpacked).')
    expect(result.unpacked).toEqual(['SKU-SURFBOARD', 'SKU-PIANO'])
    expect(result.boxes).toEqual([])
  })

  it('returns success with no boxes when the solver had nothing to pack', () => {
    const result = fromSolverOutput({ results: [], failed: [] })
    expect(result.status).toBe('success')
    expect(result.boxes).toEqual([])
    expect(result.unpacked).toEqual([])
  })

  it('defaults a missing failed list to an empty unpacked list', () => {
    const result = fromSolverOutput({ results: [] })
    expect(result.unpacked).toEqual([])
  })

  it('disambiguates duplicate box references in the output', () => {
    const result = fromSolverOutput({
      results: [
        { boxReference: 'Crate', placements: [] },
        { boxReference: 'Crate', placements: [] },
      ],
    })
    expect(result.boxes.map((b) => b.boxId)).toEqual(['Crate', 'Crate-2'])
  })
})
