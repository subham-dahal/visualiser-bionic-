import type { PackingResult } from '../types/packing'

// Placeholder scene shown when no result/orderId is supplied (standalone dev mode).
// Dimensions are in mm, same convention as a real PackingResult.
// Mix of repeated items to show grouping: same name + size share a row and colour,
// a rotated Shoebox still groups with the others, a larger Shoebox gets its own group.
export const DEMO_RESULT: PackingResult = {
  status: 'success',
  source: 'mock',
  unpacked: [],
  boxes: [
    {
      boxId: 'DEMO',
      dimensions: { width: 1200, depth: 600, length: 800 },
      items: [
        { itemId: 'Shoebox', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 0, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 300, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 600, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 900, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { width: 200, depth: 150, length: 300 }, position: { x: 600, y: 150, z: 0 } },
        { itemId: 'Shoebox', dimensions: { width: 400, depth: 150, length: 250 }, position: { x: 500, y: 0, z: 200 } },
      { itemId: 'Kettle', dimensions: { width: 250, depth: 300, length: 250 }, position: { x: 0, y: 0, z: 200 } },
        { itemId: 'Kettle', dimensions: { width: 250, depth: 300, length: 250 }, position: { x: 250, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { width: 100, depth: 120, length: 100 }, position: { x: 900, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { width: 100, depth: 120, length: 100 }, position: { x: 1000, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { width: 100, depth: 120, length: 100 }, position: { x: 1100, y: 0, z: 200 } },
        { itemId: 'Book', dimensions: { width: 200, depth: 40, length: 150 }, position: { x: 900, y: 150, z: 0 } },
        { itemId: 'Book', dimensions: { width: 200, depth: 40, length: 150 }, position: { x: 900, y: 190, z: 0 } },
        { itemId: 'Fragile Glassware', dimensions: { width: 300, depth: 400, length: 300 }, position: { x: 0, y: 0, z: 450 } },
      ],
    },
  ],
}
