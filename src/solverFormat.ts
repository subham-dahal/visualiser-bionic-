import type { PackedBox, PackedItem, PackingResult } from './App'

/**
 * Raw output shape from FitSolver, as shared by the solver team, e.g.:
 * { "results": [{ "box_reference": "BOX-001", "placements": [...],
 *   "total_weight": 23.75, "utilization": 0.82,
 *   "outer_width": 100, "outer_length": 200, "outer_depth": 50 }], "failed": [] }
 */
export type SolverPlacement = {
  item_code: string
  item_reference: string
  x: number
  y: number
  z: number
  width: number
  length: number
  depth: number
}

export type SolverBoxResult = {
  box_reference: string
  placements: SolverPlacement[]
  total_weight: number
  utilization: number
  outer_width: number
  outer_length: number
  outer_depth: number
}

export type SolverOutput = {
  results: SolverBoxResult[]
  failed: string[]
}

/**
 * Converts FitSolver's raw output into the PackingResult shape our scene renders
 * (the same shape FitPortal's frontend already reads from GET /api/orders/:id/result).
 *
 * FitSolver places each item by its x,y bottom-left floor position (width x length
 * footprint), with z as the vertical stacking axis (item height = its depth field).
 * three.js is y-up, so we swap solver y/z when mapping into our render axes: our
 * vertical "h" <- solver depth, our other floor axis "d" <- solver length.
 *
 * `rotation` isn't present in the raw solver output at all, so it's left undefined here.
 */
export function fromSolverOutput(raw: SolverOutput): PackingResult {
  const boxes: PackedBox[] = raw.results.map((box) => ({
    boxId: box.box_reference,
    dimensions: { w: box.outer_width, h: box.outer_depth, d: box.outer_length },
    items: box.placements.map(
      (p): PackedItem => ({
        itemId: p.item_code,
        dimensions: { w: p.width, h: p.depth, d: p.length },
        position: { x: p.x, y: p.z, z: p.y },
      })
    ),
  }))

  return {
    status: boxes.length > 0 ? 'success' : 'error',
    source: 'bionic-solver',
    unpacked: raw.failed,
    boxes,
  }
}
