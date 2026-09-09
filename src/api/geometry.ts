import type { PackedItem } from '../types/packing'

/**
 * True if the two items' axis-aligned bounding boxes overlap by more than
 * `epsilon` along every axis. Faces that are exactly flush (touching at the
 * boundary) do not count as overlap.
 */
export function aabbOverlap(a: PackedItem, b: PackedItem, epsilon = 0.01): boolean {
  const overlapX =
    Math.min(a.position.x + a.dimensions.w, b.position.x + b.dimensions.w) -
    Math.max(a.position.x, b.position.x)
  const overlapY =
    Math.min(a.position.y + a.dimensions.h, b.position.y + b.dimensions.h) -
    Math.max(a.position.y, b.position.y)
  const overlapZ =
    Math.min(a.position.z + a.dimensions.d, b.position.z + b.dimensions.d) -
    Math.max(a.position.z, b.position.z)
  return overlapX > epsilon && overlapY > epsilon && overlapZ > epsilon
}

/** All pairs of item indices whose AABBs overlap. Empty means the packing is clean. */
export function findOverlaps(items: PackedItem[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (aabbOverlap(items[i]!, items[j]!)) {
        pairs.push([i, j])
      }
    }
  }
  return pairs
}
