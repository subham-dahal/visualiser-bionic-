import type { PackedItem } from '../types/packing'

// Items with the same item reference and size share a group (one row in the panel).
// Dimensions are sorted so a rotated copy of the same item still matches.
// The names get joined for the label, so "Shoebox 1" and "Shoebox 2" (ref "Shoebox") show as one row.
// Each group gets its own colour, so a different sized Shoebox shows in a different colour.
export type ItemGroup = {
  itemId: string
  label: string
  dimensions: PackedItem['dimensions']
  items: PackedItem[]
  itemIndices: number[]
  colourIndex: number
}

// use the itemId if there's no ref
export const refOf = (item: PackedItem) => item.itemReference ?? item.itemId

const groupKey = (item: PackedItem) => {
  const { width, depth, length } = item.dimensions
  return `${refOf(item)}|${[width, depth, length].sort((a, b) => a - b).join('x')}`
}

// "Shoebox" if they're all called the same, "Shoebox 1, 2" if only the end bit differs,
// otherwise just list them all eg "Novel, Cookbook"
const labelOf = (items: PackedItem[]) => {
  const names = [...new Set(items.map((item) => item.itemId))]
  if (names.length === 1) return names[0]!
  const split = names.map((name) => {
    const cut = name.lastIndexOf(' ')
    return cut === -1 ? null : { start: name.slice(0, cut), end: name.slice(cut + 1) }
  })
  const start = split[0]?.start
  if (split.every((part) => part !== null && part.start === start)) {
    return `${start} ${split.map((part) => part!.end).join(', ')}`
  }
  return names.join(', ')
}

export const groupItems = (items: PackedItem[]) => {
  const groups = new Map<string, ItemGroup>()
  items.forEach((item, i) => {
    const key = groupKey(item)
    let group = groups.get(key)
    if (!group) {
      group = {
        itemId: item.itemId,
        label: item.itemId,
        dimensions: item.dimensions,
        items: [],
        itemIndices: [],
        colourIndex: groups.size,
      }
      groups.set(key, group)
    }
    group.items.push(item)
    group.itemIndices.push(i)
  })
  for (const group of groups.values()) group.label = labelOf(group.items)
  return [...groups.values()]
}
