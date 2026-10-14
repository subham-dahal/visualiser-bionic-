import { describe, expect, it } from 'vitest'
import { findOverlaps } from '../../api/geometry'
import { normalisePackingResult } from '../../api/normalise'
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
    for (const item of box.items) {
      expect(item.position.x).toBeGreaterThanOrEqual(0)
      expect(item.position.y).toBeGreaterThanOrEqual(0)
      expect(item.position.z).toBeGreaterThanOrEqual(0)
      expect(item.position.x + item.dimensions.w).toBeLessThanOrEqual(box.dimensions.w)
      expect(item.position.y + item.dimensions.h).toBeLessThanOrEqual(box.dimensions.h)
      expect(item.position.z + item.dimensions.d).toBeLessThanOrEqual(box.dimensions.d)
    }
  })

  it('passes through the normaliser unchanged', () => {
    expect(normalisePackingResult(DEMO_RESULT)).toEqual(DEMO_RESULT)
  })
})
