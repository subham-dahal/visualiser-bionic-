import { describe, expect, it } from 'vitest'
import { packingOrder } from '../packingOrder'
import { DEMO_RESULT } from '../../demo/demoResult'
import type { PackedItem } from '../../types/packing'

const item = (itemId: string, x: number, y: number, z: number): PackedItem => ({
  itemId,
  dimensions: { width: 100, depth: 100, length: 100 },
  position: { x, y, z },
})

describe('packingOrder', () => {
  it('places lower items before higher ones', () => {
    const items = [item('top', 0, 200, 0), item('bottom', 0, 0, 0), item('middle', 0, 100, 0)]
    expect(packingOrder(items).map((i) => items[i]!.itemId)).toEqual(['bottom', 'middle', 'top'])
  })

  it('goes back to front, then left to right, within a layer', () => {
    const items = [item('front-right', 100, 0, 100), item('back-right', 100, 0, 0), item('front-left', 0, 0, 100), item('back-left', 0, 0, 0)]
    expect(packingOrder(items).map((i) => items[i]!.itemId)).toEqual([
      'back-left',
      'back-right',
      'front-left',
      'front-right',
    ])
  })

  it('keeps the original order for items in the same spot', () => {
    const items = [item('a', 0, 0, 0), item('b', 0, 0, 0)]
    expect(packingOrder(items)).toEqual([0, 1])
  })

  it('returns every index exactly once', () => {
    const items = DEMO_RESULT.boxes[0]!.items
    expect([...packingOrder(items)].sort((a, b) => a - b)).toEqual(items.map((_, i) => i))
  })

  it('never drops an item underneath one that is already placed', () => {
    const items = DEMO_RESULT.boxes[0]!.items
    const order = packingOrder(items)
    const footprintsOverlap = (a: PackedItem, b: PackedItem) =>
      a.position.x < b.position.x + b.dimensions.width &&
      b.position.x < a.position.x + a.dimensions.width &&
      a.position.z < b.position.z + b.dimensions.length &&
      b.position.z < a.position.z + a.dimensions.length
    order.forEach((i, step) => {
      const placed = items[i]!
      for (const j of order.slice(step + 1)) {
        const later = items[j]!
        if (footprintsOverlap(placed, later)) {
          expect(later.position.y).toBeGreaterThanOrEqual(placed.position.y + placed.dimensions.depth)
        }
      }
    })
  })

  it('handles an empty box', () => {
    expect(packingOrder([])).toEqual([])
  })
})
