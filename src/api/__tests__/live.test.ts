import { describe, expect, it } from 'vitest'
import portalLive from '../../fixtures/portal-live.json'
import solverLive from '../../fixtures/solver-live.json'
import { findOverlaps } from '../geometry'
import { NormaliseError, normalisePackingResult } from '../normalise'
import type { PackedBox } from '../../types/packing'

// See fixtures/README.md: solver-live.json is a real FitSolver run (Oct 18 build, nested
// placements); portal-live.json is that same result passed through FitPortal main's own
// normaliseSolverResponse, i.e. exactly what Portal hands the visualiser as `result`.

const expectInsideBox = (box: PackedBox) => {
  for (const item of box.items) {
    expect(item.position.x + item.dimensions.width).toBeLessThanOrEqual(box.dimensions.width)
    expect(item.position.y + item.dimensions.depth).toBeLessThanOrEqual(box.dimensions.depth)
    expect(item.position.z + item.dimensions.length).toBeLessThanOrEqual(box.dimensions.length)
  }
}

describe('current FitSolver output (nested placements)', () => {
  const result = normalisePackingResult(solverLive)
  const box = result.boxes[0]!

  it('reads box size and item ids from the nested shape', () => {
    expect(result.status).toBe('success')
    expect(box.boxId).toBe('Carton-L')
    expect(box.dimensions).toEqual({ width: 600, depth: 300, length: 400 })
    expect(box.items).toHaveLength(11)
    expect(box.items[0]).toEqual({
      itemId: 'MONITOR',
      dimensions: { width: 550, depth: 60, length: 350 },
      position: { x: 0, y: 0, z: 0 },
    })
  })

  it('uses the placed (rotated) size, not the catalogue size', () => {
    // SHOEBOX is 340 x 210 in the catalogue; the solver turned the second one 90 degrees
    const shoeboxes = box.items.filter((i) => i.itemId === 'SHOEBOX')
    expect(shoeboxes.map((i) => [i.dimensions.width, i.dimensions.length])).toEqual([
      [340, 210],
      [210, 340],
    ])
  })

  it('turns failed item records into item codes', () => {
    expect(result.unpacked).toEqual(['PIANO'])
  })

  it('packs with no overlaps and nothing outside the carton', () => {
    expect(findOverlaps(box.items)).toEqual([])
    expectInsideBox(box)
  })

  it('stacks on y: the shoebox rests on top of the monitor', () => {
    const monitor = box.items.find((i) => i.itemId === 'MONITOR')!
    const shoebox = box.items.find((i) => i.itemId === 'SHOEBOX')!
    expect(shoebox.position.y).toBe(monitor.position.y + monitor.dimensions.depth)
  })
})

describe("FitPortal's result prop ({ w, h, d } dimensions)", () => {
  const result = normalisePackingResult(portalLive)

  it('maps w/h/d to width/depth/length (h is vertical)', () => {
    expect(result.boxes[0]!.dimensions).toEqual({ width: 600, depth: 300, length: 400 })
    expect(result.boxes[0]!.items[0]!.dimensions).toEqual({ width: 550, depth: 60, length: 350 })
  })

  it('keeps Portal extras like rotation "XYZ" and itemCode', () => {
    const item = result.boxes[0]!.items[0]! as unknown as Record<string, unknown>
    expect(item.rotation).toBe('XYZ')
    expect(item.itemCode).toBe('MONITOR')
  })

  // The contract test: Portal and the visualiser must agree on every axis.
  it('renders exactly the same scene as the raw solver output', () => {
    const fromSolver = normalisePackingResult(solverLive)
    const strip = (boxes: PackedBox[]) =>
      boxes.map((b) => ({
        boxId: b.boxId,
        dimensions: b.dimensions,
        items: b.items.map((i) => ({ itemId: i.itemId, dimensions: i.dimensions, position: i.position })),
      }))
    expect(strip(result.boxes)).toEqual(strip(fromSolver.boxes))
    expect(result.unpacked).toEqual(fromSolver.unpacked)
  })

  it('explains which keys it got when a box has no usable dimensions', () => {
    const broken = { ...portalLive, boxes: [{ ...portalLive.boxes[0], dimensions: null }] }
    expect(() => normalisePackingResult(broken)).toThrow(NormaliseError)
    expect(() => normalisePackingResult(broken)).toThrow('boxes[0] is missing boxId, dimensions, or items')
    const odd = { ...portalLive, boxes: [{ ...portalLive.boxes[0], dimensions: { x: 1 } }] }
    expect(() => normalisePackingResult(odd)).toThrow('got keys: x')
  })
})
