import { describe, expect, it } from 'vitest'
import { findOverlaps } from '../../api/geometry'
import { normalisePackingResult, validatePackingResult } from '../../api/normalise'
import { groupItems } from '../../utils/grouping'
import { DEMO_RESULT } from '../demoResult'

// The demo scene is what people see first in standalone mode, so it should be a valid, clean packing
describe('DEMO_RESULT', () => {
  const box = DEMO_RESULT.boxes[0]!

  it('is a successful mock result with one box', () => {
    expect(DEMO_RESULT.status).toBe('success')
    expect(DEMO_RESULT.source).toBe('mock')
    expect(DEMO_RESULT.boxes).toHaveLength(1)
  })

  it('has no overlapping items', () => {
    expect(findOverlaps(box.items)).toEqual([])
  })

  it('keeps every item inside the box', () => {
    expect(() => validatePackingResult(DEMO_RESULT)).not.toThrow()
    for (const item of box.items) {
      expect(item.dimensions.width).toBeGreaterThan(0)
      expect(item.dimensions.depth).toBeGreaterThan(0)
      expect(item.dimensions.length).toBeGreaterThan(0)
      expect(item.position.x).toBeGreaterThanOrEqual(0)
      expect(item.position.y).toBeGreaterThanOrEqual(0)
      expect(item.position.z).toBeGreaterThanOrEqual(0)
      expect(item.position.x + item.dimensions.width).toBeLessThanOrEqual(box.dimensions.width)
      expect(item.position.y + item.dimensions.depth).toBeLessThanOrEqual(box.dimensions.depth)
      expect(item.position.z + item.dimensions.length).toBeLessThanOrEqual(box.dimensions.length)
    }
  })

  it('gives every item an item ref', () => {
    for (const item of box.items) {
      expect(item.itemReference).toBeTruthy()
    }
  })

  it('puts the Novel and Cookbook in one row since they share the BOOK ref', () => {
    const groups = groupItems(box.items)
    const books = groups.find((g) => g.label === 'Novel, Cookbook')!
    expect(books.items).toHaveLength(2)
    expect(new Set(groups.map((g) => g.colourIndex)).size).toBe(groups.length)
  })

  it('passes through the normaliser unchanged', () => {
    expect(normalisePackingResult(DEMO_RESULT)).toEqual(DEMO_RESULT)
  })
})
