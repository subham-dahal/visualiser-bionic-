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
      dimensions: { w: 1200, d: 600, l: 800 },
      items: [
        { itemId: 'Shoebox', dimensions: { w: 300, d: 150, l: 200 }, position: { x: 0, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 300, d: 150, l: 200 }, position: { x: 300, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 300, d: 150, l: 200 }, position: { x: 600, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 300, d: 150, l: 200 }, position: { x: 900, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 200, d: 150, l: 300 }, position: { x: 600, y: 150, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 400, d: 150, l: 250 }, position: { x: 500, y: 0, z: 200 } },
      { itemId: 'Kettle', dimensions: { w: 250, d: 300, l: 250 }, position: { x: 0, y: 0, z: 200 } },
        { itemId: 'Kettle', dimensions: { w: 250, d: 300, l: 250 }, position: { x: 250, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { w: 100, d: 120, l: 100 }, position: { x: 900, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { w: 100, d: 120, l: 100 }, position: { x: 1000, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { w: 100, d: 120, l: 100 }, position: { x: 1100, y: 0, z: 200 } },
        { itemId: 'Book', dimensions: { w: 200, d: 40, l: 150 }, position: { x: 900, y: 150, z: 0 } },
        { itemId: 'Book', dimensions: { w: 200, d: 40, l: 150 }, position: { x: 900, y: 190, z: 0 } },
        { itemId: 'Fragile Glassware', dimensions: { w: 300, d: 400, l: 300 }, position: { x: 0, y: 0, z: 450 } },
      ],
    },
  ],
}
