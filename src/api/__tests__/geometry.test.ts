import { describe, expect, it } from 'vitest'
import type { PackedItem } from '../../types/packing'
import { aabbOverlap, findOverlaps } from '../geometry'

const item = (
  itemId: string,
  [x, y, z]: [number, number, number],
  [w, h, d]: [number, number, number],
): PackedItem => ({ itemId, position: { x, y, z }, dimensions: { w, h, d } })

// aabbOverlap: two boxes overlap only if they intersect by more than epsilon on every axis
describe('aabbOverlap', () => {
  it('detects two shoeboxes that intersect on all three axes', () => {
    const a = item('Shoebox', [0, 0, 0], [300, 150, 200])
    const b = item('Shoebox', [150, 50, 100], [300, 150, 200])
    expect(aabbOverlap(a, b)).toBe(true)
  })

  it('is symmetric', () => {
    const a = item('Kettle', [0, 0, 0], [250, 300, 250])
    const b = item('Mug', [200, 250, 200], [100, 120, 100])
    expect(aabbOverlap(a, b)).toBe(aabbOverlap(b, a))
    expect(aabbOverlap(a, b)).toBe(true)
  })

  it('detects an item fully contained inside another', () => {
    const outer = item('Gift Box', [0, 0, 0], [500, 500, 500])
    const inner = item('Watch', [200, 200, 200], [50, 30, 50])
    expect(aabbOverlap(outer, inner)).toBe(true)
  })

  it('detects two identical items at the same position', () => {
    const a = item('Book', [900, 150, 0], [200, 40, 150])
    expect(aabbOverlap(a, { ...a })).toBe(true)
  })

  it.each([
    ['x', [300, 0, 0]],
    ['y', [0, 150, 0]],
    ['z', [0, 0, 200]],
  ] as const)('does not count faces flush along %s as overlap', (_axis, pos) => {
    const a = item('Shoebox', [0, 0, 0], [300, 150, 200])
    const b = item('Shoebox', [...pos], [300, 150, 200])
    expect(aabbOverlap(a, b)).toBe(false)
  })

  it('returns false when items are separated by a gap', () => {
    const a = item('Mug', [0, 0, 0], [100, 120, 100])
    const b = item('Mug', [150, 0, 0], [100, 120, 100])
    expect(aabbOverlap(a, b)).toBe(false)
  })

  it('returns false when items overlap on two axes but not the third', () => {
    const a = item('Book', [0, 0, 0], [200, 40, 150])
    const b = item('Book', [50, 40, 50], [200, 40, 150]) // stacked directly on top
    expect(aabbOverlap(a, b)).toBe(false)
  })

  it('ignores overlap smaller than the default epsilon (solver float rounding)', () => {
    const a = item('Shoebox', [0, 0, 0], [300, 150, 200])
    const b = item('Shoebox', [299.995, 0, 0], [300, 150, 200])
    expect(aabbOverlap(a, b)).toBe(false)
  })

  it('reports overlap just above the default epsilon', () => {
    const a = item('Shoebox', [0, 0, 0], [300, 150, 200])
    const b = item('Shoebox', [299.98, 0, 0], [300, 150, 200])
    expect(aabbOverlap(a, b)).toBe(true)
  })

  it('respects a custom epsilon', () => {
    const a = item('Crate', [0, 0, 0], [1000, 1000, 1000])
    const b = item('Crate', [995, 0, 0], [1000, 1000, 1000]) // 5mm overlap
    expect(aabbOverlap(a, b, 10)).toBe(false)
    expect(aabbOverlap(a, b, 1)).toBe(true)
  })

  it('never reports overlap for a zero-volume item', () => {
    const flat = item('Envelope', [10, 10, 10], [200, 0, 100])
    const box = item('Shoebox', [0, 0, 0], [300, 150, 200])
    expect(aabbOverlap(flat, box)).toBe(false)
  })

  it('handles negative coordinates', () => {
    const a = item('Pallet', [-500, -100, -400], [1000, 150, 800])
    const b = item('Drum', [0, 0, 0], [300, 400, 300])
    expect(aabbOverlap(a, b)).toBe(true)
  })
})

// findOverlaps: every overlapping index pair, each reported once with i < j
describe('findOverlaps', () => {
  it('returns no pairs for an empty list', () => {
    expect(findOverlaps([])).toEqual([])
  })

  it('returns no pairs for a single item', () => {
    expect(findOverlaps([item('Kettle', [0, 0, 0], [250, 300, 250])])).toEqual([])
  })

  it('returns no pairs for a cleanly packed row of mugs', () => {
    const mugs = [0, 100, 200, 300].map((x) => item('Mug', [x, 0, 0], [100, 120, 100]))
    expect(findOverlaps(mugs)).toEqual([])
  })

  it('returns each overlapping pair once, ordered by index', () => {
    const items = [
      item('Shoebox', [0, 0, 0], [300, 150, 200]),
      item('Mug', [1000, 0, 0], [100, 120, 100]),
      item('Kettle', [100, 0, 100], [250, 300, 250]), // hits Shoebox
      item('Mug', [1050, 0, 50], [100, 120, 100]), // hits the first Mug
    ]
    expect(findOverlaps(items)).toEqual([
      [0, 2],
      [1, 3],
    ])
  })

  it('reports every pair when three items share the same space', () => {
    const stack = [0, 1, 2].map(() => item('Book', [0, 0, 0], [200, 40, 150]))
    expect(findOverlaps(stack)).toEqual([
      [0, 1],
      [0, 2],
      [1, 2],
    ])
  })
})
