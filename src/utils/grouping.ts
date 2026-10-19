import type { PackedItem } from '../types/packing'

// Items with the same name and size share a group (and so a colour).
// Dimensions are sorted so a rotated copy of the same item still matches.
export type ItemGroup = {
  itemId: string
  dimensions: PackedItem['dimensions']
  items: PackedItem[]
  itemIndices: number[]
}

const groupKey = (item: PackedItem) => {
  const { width, depth, length } = item.dimensions
  return `${item.itemId}|${[width, depth, length].sort((a, b) => a - b).join('x')}`
}

export const groupItems = (items: PackedItem[]) => {
  const groups = new Map<string, ItemGroup>()
  items.forEach((item, i) => {
    const key = groupKey(item)
    let group = groups.get(key)
    if (!group) {
      group = { itemId: item.itemId, dimensions: item.dimensions, items: [], itemIndices: [] }
      groups.set(key, group)
    }
    group.items.push(item)
    group.itemIndices.push(i)
  })
  return [...groups.values()]
}
