import type { Dims, PackedBox, PackedItem, PackingResult } from './types/packing'

/**
 * Raw output shape from FitSolver. Field names may be camelCase or snake_case;
 * both are live in production. Unknown top-level fields (algorithmUs, serverUs, …)
 * are ignored.
 */
/** An item record as FitSolver returns it, both inside a placement and in `failed`. */
export type SolverItem = {
  itemCode?: string
  item_code?: string
  itemReference?: string
  item_reference?: string
  width: number
  length: number
  depth: number
  weight?: number
}

/**
 * Before solver commit 5796ed5 (14 Oct) a placement was flat: { itemCode, x, y, z, width, … }.
 * Since then the item record is nested: { x, y, z, item: { itemCode, width, … } }.
 * In both, width/length/depth are the item's size as placed (after any rotation).
 */
export type SolverPlacement =
  | (SolverItem & { x: number; y: number; z: number; item?: undefined })
  | { x: number; y: number; z: number; item: SolverItem }

type FlatPlacement = SolverItem & { x: number; y: number; z: number }

export type SolverBoxResult = {
  boxReference?: string
  box_reference?: string
  placements: SolverPlacement[]
  total_weight?: number
  totalWeight?: number
  utilization?: number
  width?: number
  length?: number
  depth?: number
  outer_width?: number
  outer_length?: number
  outer_depth?: number
}

export type SolverOutput = {
  results: SolverBoxResult[]
  /** Item codes (older solver) or full item records (since 14 Oct). */
  failed?: Array<string | SolverItem>
}

function flattenPlacement(p: SolverPlacement): FlatPlacement {
  if (p.item) return { ...p.item, x: p.x, y: p.y, z: p.z }
  return p
}

function failedItemId(entry: string | SolverItem, index: number): string {
  if (typeof entry === 'string') return entry
  return (
    firstString(entry.itemCode, entry.item_code, entry.itemReference, entry.item_reference) ?? `unpacked-${index}`
  )
}

function presentDim(value: unknown): number | undefined {
  if (typeof value !== 'number' || value === 0) return undefined
  return value
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string') return value
  }
  return undefined
}

/**
 * If two boxes share a boxId, later ones become `${id}-2`, `${id}-3`, …
 * so every boxId in a PackingResult is unique (App.tsx uses it as a React key).
 */
export function uniquifyBoxIds(boxes: PackedBox[]): PackedBox[] {
  const used = new Set<string>()
  return boxes.map((box) => {
    if (!used.has(box.boxId)) {
      used.add(box.boxId)
      return box
    }
    let n = 2
    let candidate = `${box.boxId}-${n}`
    while (used.has(candidate)) {
      n += 1
      candidate = `${box.boxId}-${n}`
    }
    used.add(candidate)
    console.warn(`Duplicate boxId "${box.boxId}" disambiguated to "${candidate}"`)
    return { ...box, boxId: candidate }
  })
}

function placementItemId(placement: FlatPlacement, index: number, boxId: string): string {
  const itemId = firstString(
    placement.itemCode,
    placement.item_code,
    placement.itemReference,
    placement.item_reference,
  )
  if (itemId !== undefined) return itemId
  const generated = `item-${index}`
  console.warn(
    `Missing item id for placement ${index} in box "${boxId}"; generated "${generated}"`,
  )
  return generated
}

function outerDims(box: SolverBoxResult): Dims | undefined {
  const width = presentDim(box.width) ?? presentDim(box.outer_width)
  const length = presentDim(box.length) ?? presentDim(box.outer_length)
  const depth = presentDim(box.depth) ?? presentDim(box.outer_depth)
  if (width === undefined || length === undefined || depth === undefined) return undefined
  return { width, depth, length }
}

function deriveDims(placements: FlatPlacement[], boxId: string): Dims {
  let width = 0
  let depth = 0
  let length = 0
  for (const p of placements) {
    width = Math.max(width, p.x + p.width)
    depth = Math.max(depth, p.y + p.depth)
    length = Math.max(length, p.z + p.length)
  }
  console.warn(`Derived dimensions for box "${boxId}" from placements`)
  return { width, depth, length }
}

/**
 * Converts FitSolver's raw output into the PackingResult shape our scene renders
 * (the same shape FitPortal's frontend already reads from GET /api/orders/:id/result).
 *
 * FitSolver places each item at (x, y, z) with y as the vertical stacking axis
 * (item height = its depth field). Position is a direct pass-through; there is
 * no axis swap. Dimensions map as { width, depth, length } directly.
 *
 * `rotation` isn't present in the raw solver output at all, so it's left undefined here.
 */
export function fromSolverOutput(raw: SolverOutput): PackingResult {
  const results = raw.results ?? []
  const failed = (raw.failed ?? []).map(failedItemId)

  const boxes: PackedBox[] = results.map((box, boxIndex) => {
    const placements = (box.placements ?? []).map(flattenPlacement)
    const boxId =
      firstString(box.boxReference, box.box_reference) ?? `box-${boxIndex}`
    const dimensions = outerDims(box) ?? deriveDims(placements, boxId)
    const items: PackedItem[] = placements.map((p, itemIndex) => ({
      itemId: placementItemId(p, itemIndex, boxId),
      ...withReference(p),
      dimensions: { width: p.width, depth: p.depth, length: p.length },
      position: { x: p.x, y: p.y, z: p.z },
    }))
    return { boxId, dimensions, items }
  })

  const uniqueBoxes = uniquifyBoxIds(boxes)

  if (results.length === 0 && failed.length > 0) {
    return {
      status: 'error',
      source: 'bionic-solver',
      message: `Solver returned no packed boxes (${failed.length} unpacked).`,
      unpacked: failed,
      boxes: uniqueBoxes,
    }
  }

  return {
    status: 'success',
    source: 'bionic-solver',
    unpacked: failed,
    boxes: uniqueBoxes,
  }
}
