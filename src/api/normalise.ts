import { fromSolverOutput, uniquifyBoxIds, type SolverOutput } from '../solverFormat'
import type { Dims, PackedBox, PackedItem, PackingResult } from '../types/packing'

export class NormaliseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NormaliseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Portal (and visualiser releases before the width/depth/length rename) send dimensions as
 * { w, h, d } with h = vertical = solver depth, d = solver length. Map that to our names.
 */
function toDims(raw: unknown, where: string): Dims {
  if (!isRecord(raw)) throw new NormaliseError(`${where} dimensions are missing`)
  if (typeof raw.width === 'number' && typeof raw.depth === 'number' && typeof raw.length === 'number') {
    return { width: raw.width, depth: raw.depth, length: raw.length }
  }
  if (typeof raw.w === 'number' && typeof raw.h === 'number' && typeof raw.d === 'number') {
    return { width: raw.w, depth: raw.h, length: raw.d }
  }
  throw new NormaliseError(
    `${where} dimensions need width/depth/length (or w/h/d); got keys: ${Object.keys(raw).join(', ') || '(none)'}`,
  )
}

function fromPortalResult(raw: Record<string, unknown>): PackingResult {
  const boxesRaw = raw.boxes
  if (!Array.isArray(boxesRaw)) {
    throw new NormaliseError('Portal-style payload is missing a boxes array')
  }

  const boxes: PackedBox[] = boxesRaw.map((box, index) => {
    if (!isRecord(box)) {
      throw new NormaliseError(`boxes[${index}] is not an object`)
    }
    if (typeof box.boxId !== 'string' || box.dimensions == null || !Array.isArray(box.items)) {
      throw new NormaliseError(
        `boxes[${index}] is missing boxId, dimensions, or items`,
      )
    }
    const items = box.items.map((item: unknown, itemIndex: number): PackedItem => {
      const where = `boxes[${index}].items[${itemIndex}]`
      if (!isRecord(item)) throw new NormaliseError(`${where} is not an object`)
      return { ...(item as PackedItem), dimensions: toDims(item.dimensions, where) }
    })
    return { ...(box as PackedBox), dimensions: toDims(box.dimensions, `boxes[${index}]`), items }
  })

  return { ...(raw as PackingResult), boxes: uniquifyBoxIds(boxes) }
}

export function normalisePackingResult(raw: unknown): PackingResult {
  if (!isRecord(raw)) {
    throw new NormaliseError(
      `Unrecognised packing payload (not an object). Top-level keys: (none)`,
    )
  }

  if (Array.isArray(raw.boxes)) {
    return fromPortalResult(raw)
  }

  if (Array.isArray(raw.results)) {
    return fromSolverOutput(raw as SolverOutput)
  }

  // Portal's endpoint may wrap the payload as { result: {...} }
  if (isRecord(raw.result)) {
    return normalisePackingResult(raw.result)
  }

  const keys = Object.keys(raw)
  throw new NormaliseError(
    `Unrecognised packing payload. Top-level keys: ${keys.length > 0 ? keys.join(', ') : '(none)'}`,
  )
}
