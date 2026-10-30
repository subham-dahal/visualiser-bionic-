import { describe, expect, it } from 'vitest'
import { DEMO_RESULT } from '../../demo/demoResult'
import type { PackedItem } from '../../types/packing'
import { groupItems } from '../grouping'

const item = (itemId: string, [width, depth, length]: [number, number, number], x = 0): PackedItem => ({
  itemId,
  dimensions: { width, depth, length },
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
      { itemId: 'Kettle', label: 'Kettle', dimensions: kettle.dimensions, items: [kettle], itemIndices: [0], colourIndex: 0 },
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
    expect(groups[0]?.dimensions).toEqual({ width: 200, depth: 150, length: 300 })
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
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ['Shoebox 1, 2, 3, 4, 5', 5], // includes the rotated one
      ['Shoebox 6', 1], // the larger one
      ['Kettle', 2],
      ['Mug', 3],
      ['Novel, Cookbook', 2], // same BOOK ref so one row
      ['Fragile Glassware', 1],
    ])
  })

  it('puts items with the same ref in one row with their names joined', () => {
    const groups = groupItems([
      { ...item('Shoebox 1', [300, 150, 200]), itemReference: 'Shoebox' },
      { ...item('Kettle', [250, 300, 250]), itemReference: 'Kettle' },
      { ...item('Shoebox 2', [200, 150, 300]), itemReference: 'Shoebox' },
    ])
    expect(groups.map((g) => [g.label, g.itemIndices, g.colourIndex])).toEqual([
      ['Shoebox 1, 2', [0, 2], 0],
      ['Kettle', [1], 1],
    ])
  })

  it('lists the full names when they dont share a start', () => {
    const groups = groupItems([
      { ...item('Novel', [200, 40, 150]), itemReference: 'BOOK' },
      { ...item('Big Cookbook', [200, 40, 150]), itemReference: 'BOOK' },
    ])
    expect(groups[0]?.label).toBe('Novel, Big Cookbook')
  })

  it('only lists each name once in the label', () => {
    const groups = groupItems([item('Mug', [100, 120, 100]), item('Mug', [100, 120, 100])])
    expect(groups[0]?.label).toBe('Mug')
  })

  it('keeps a different sized item with the same ref in its own row and colour', () => {
    const groups = groupItems([
      { ...item('Shoebox 1', [300, 150, 200]), itemReference: 'Shoebox' },
      { ...item('Shoebox XL', [400, 150, 250]), itemReference: 'Shoebox' },
    ])
    expect(groups.map((g) => [g.label, g.colourIndex])).toEqual([
      ['Shoebox 1', 0],
      ['Shoebox XL', 1],
    ])
  })

  it('gives different refs different colours', () => {
    const groups = groupItems([
      { ...item('Box', [100, 100, 100]), itemReference: 'A' },
      { ...item('Box', [200, 200, 200]), itemReference: 'B' },
    ])
    expect(groups.map((g) => g.colourIndex)).toEqual([0, 1])
  })

  it('falls back to the itemId when there is no ref', () => {
    const groups = groupItems([item('Shoebox', [300, 150, 200]), item('Mug', [100, 120, 100]), item('Shoebox', [400, 150, 250])])
    expect(groups.map((g) => g.colourIndex)).toEqual([0, 1, 2])
  })
})
