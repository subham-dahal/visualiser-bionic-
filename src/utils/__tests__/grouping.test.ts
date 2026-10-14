import { describe, expect, it } from 'vitest'
import { DEMO_RESULT } from '../../demo/demoResult'
import type { PackedItem } from '../../types/packing'
import { groupItems } from '../grouping'

const item = (itemId: string, [w, h, d]: [number, number, number], x = 0): PackedItem => ({
  itemId,
  dimensions: { w, h, d },
  position: { x, y: 0, z: 0 },
})

// groupItems: items with the same id and the same size (in any orientation) share a group
describe('groupItems', () => {
  it('returns no groups for an empty box', () => {
    expect(groupItems([])).toEqual([])
  })

  it('puts a single item in its own group', () => {
    const kettle = item('Kettle', [250, 300, 250])
    expect(groupItems([kettle])).toEqual([
      { itemId: 'Kettle', dimensions: kettle.dimensions, items: [kettle], itemIndices: [0] },
    ])
  })

  it('groups identical items and records their original indices', () => {
    const items = [
      item('Mug', [100, 120, 100], 0),
      item('Kettle', [250, 300, 250], 100),
      item('Mug', [100, 120, 100], 350),
    ]
    const groups = groupItems(items)
    expect(groups).toHaveLength(2)
    expect(groups[0]?.itemId).toBe('Mug')
    expect(groups[0]?.itemIndices).toEqual([0, 2])
    expect(groups[0]?.items).toEqual([items[0], items[2]])
    expect(groups[1]?.itemIndices).toEqual([1])
  })

  it('groups a rotated copy with the original', () => {
    const groups = groupItems([item('Shoebox', [300, 150, 200]), item('Shoebox', [200, 150, 300])])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.itemIndices).toEqual([0, 1])
  })

  it('keeps the first-seen orientation as the group dimensions', () => {
    const groups = groupItems([item('Shoebox', [200, 150, 300]), item('Shoebox', [300, 150, 200])])
    expect(groups[0]?.dimensions).toEqual({ w: 200, h: 150, d: 300 })
  })

  it('separates items with the same id but a different size', () => {
    const groups = groupItems([item('Shoebox', [300, 150, 200]), item('Shoebox', [400, 150, 250])])
    expect(groups).toHaveLength(2)
  })

  it('separates items with the same size but a different id', () => {
    const groups = groupItems([item('Novel', [200, 40, 150]), item('Cookbook', [200, 40, 150])])
    expect(groups.map((g) => g.itemId)).toEqual(['Novel', 'Cookbook'])
  })

  it('sorts dimensions numerically, not as strings', () => {
    // A lexical sort would put 1000 before 200 and fail to match these two
    const groups = groupItems([item('Rug', [1000, 200, 30]), item('Rug', [30, 1000, 200])])
    expect(groups).toHaveLength(1)
  })

  it('orders groups by first appearance', () => {
    const groups = groupItems([
      item('Book', [200, 40, 150]),
      item('Mug', [100, 120, 100]),
      item('Book', [200, 40, 150]),
      item('Kettle', [250, 300, 250]),
    ])
    expect(groups.map((g) => g.itemId)).toEqual(['Book', 'Mug', 'Kettle'])
  })

  it('produces the groups the demo scene is designed to show', () => {
    const groups = groupItems(DEMO_RESULT.boxes[0]!.items)
    expect(groups.map((g) => [g.itemId, g.items.length])).toEqual([
      ['Shoebox', 5], // includes the rotated one
      ['Shoebox', 1], // the larger one
      ['Kettle', 2],
      ['Mug', 3],
      ['Book', 2],
      ['Fragile Glassware', 1],
    ])
  })
})
