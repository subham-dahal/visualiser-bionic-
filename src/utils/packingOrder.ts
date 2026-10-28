import type { PackedItem } from '../types/packing'

// Order the step-by-step animation places items in: bottom layer first, then upwards.
// Within a layer it goes back to front, then left to right, so every item lands on
// something already placed and never drops through an item that's in the way.
export const packingOrder = (items: PackedItem[]) =>
  items
    .map((_, i) => i)
    .sort((a, b) => {
      const p = items[a]!.position
      const q = items[b]!.position
      return p.y - q.y || p.z - q.z || p.x - q.x || a - b
    })
