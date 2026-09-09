import { fromSolverOutput, uniquifyBoxIds, type SolverOutput } from '../solverFormat'
import type { PackedBox, PackingResult } from '../types/packing'

export class NormaliseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NormaliseError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    return box as PackedBox
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

  const keys = Object.keys(raw)
  throw new NormaliseError(
    `Unrecognised packing payload. Top-level keys: ${keys.length > 0 ? keys.join(', ') : '(none)'}`,
  )
}
