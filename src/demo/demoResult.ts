import type { PackingResult } from '../types/packing'

// Placeholder scene shown when no result/orderId is supplied (standalone dev mode).
// Dimensions are in mm, same convention as a real PackingResult.
// Mix of repeated items to show grouping: same ref + size share a row,
// a rotated Shoebox still groups with the others, a larger Shoebox gets its own row.
// Rows and colours go by itemReference + size, so the Novel and Cookbook (both BOOK) show as one row.
export const DEMO_RESULT: PackingResult = {
  status: 'success',
  source: 'mock',
  unpacked: [],
  boxes: [
    {
      boxId: 'DEMO',
      dimensions: { width: 1200, depth: 600, length: 800 },
      items: [
        { itemId: 'Shoebox 1', itemReference: 'SHOEBOX', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 0, y: 0, z: 0 } },
        { itemId: 'Shoebox 2', itemReference: 'SHOEBOX', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 300, y: 0, z: 0 } },
        { itemId: 'Shoebox 3', itemReference: 'SHOEBOX', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 600, y: 0, z: 0 } },
        { itemId: 'Shoebox 4', itemReference: 'SHOEBOX', dimensions: { width: 300, depth: 150, length: 200 }, position: { x: 900, y: 0, z: 0 } },
        { itemId: 'Shoebox 5', itemReference: 'SHOEBOX', dimensions: { width: 200, depth: 150, length: 300 }, position: { x: 600, y: 150, z: 0 } },
        { itemId: 'Shoebox 6', itemReference: 'SHOEBOX', dimensions: { width: 400, depth: 150, length: 250 }, position: { x: 500, y: 0, z: 200 } },
        { itemId: 'Kettle', itemReference: 'KETTLE', dimensions: { width: 250, depth: 300, length: 250 }, position: { x: 0, y: 0, z: 200 } },
        { itemId: 'Kettle', itemReference: 'KETTLE', dimensions: { width: 250, depth: 300, length: 250 }, position: { x: 250, y: 0, z: 200 } },
        { itemId: 'Mug', itemReference: 'MUG', dimensions: { width: 100, depth: 120, length: 100 }, position: { x: 900, y: 0, z: 200 } },
        { itemId: 'Mug', itemReference: 'MUG', dimensions: { width: 100, depth: 120, length: 100 }, position: { x: 1000, y: 0, z: 200 } },
        { itemId: 'Mug', itemReference: 'MUG', dimensions: { width: 100, depth: 120, length: 100 }, position: { x: 1100, y: 0, z: 200 } },
        { itemId: 'Novel', itemReference: 'BOOK', dimensions: { width: 200, depth: 40, length: 150 }, position: { x: 900, y: 150, z: 0 } },
        { itemId: 'Cookbook', itemReference: 'BOOK', dimensions: { width: 200, depth: 40, length: 150 }, position: { x: 900, y: 190, z: 0 } },
        { itemId: 'Fragile Glassware', itemReference: 'GLASSWARE', dimensions: { width: 300, depth: 400, length: 300 }, position: { x: 0, y: 0, z: 450 } },
      ],
    },
  ],
}
