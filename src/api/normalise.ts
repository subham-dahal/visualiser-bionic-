import { fromSolverOutput, uniquifyBoxIds, type SolverOutput } from '../solverFormat'
import type { Dims, PackedBox, PackingResult } from '../types/packing'

export class NormaliseError extends Error {
  // list of errors
  issues: string[]

  constructor(message: string, issues: string[] = []) {
    super(message)
    this.name = 'NormaliseError'
    this.issues = issues
  }
}

// small wiggle room for rounding
const BOUNDS_EPSILON = 0.01

const AXES = [
  { pos: 'x', size: 'width' },
  { pos: 'y', size: 'depth' },
  { pos: 'z', size: 'length' },
] as const

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function dimsIssues(dims: Dims | undefined, label: string): string[] {
  return AXES.filter(({ size }) => !isPositiveNumber(dims?.[size])).map(
    ({ size }) => `${label} has an invalid ${size} (${String(dims?.[size])}); sizes must be positive numbers`,
  )
}

// check sizes arent negative and items are inside the box (0,0,0 is bottom left)
export function validatePackingResult(result: PackingResult): PackingResult {
  const issues: string[] = []

  for (const box of result.boxes ?? []) {
    const boxIssues = dimsIssues(box.dimensions, `Box "${box.boxId}"`)
    issues.push(...boxIssues)

    const items = box.items ?? []
    items.forEach((item, index) => {
      const label = `Item "${item.itemId}" (#${index}) in box "${box.boxId}"`
      const itemIssues = dimsIssues(item.dimensions, label)
      issues.push(...itemIssues)

      for (const { pos, size } of AXES) {
        const start = item.position?.[pos]
        if (typeof start !== 'number' || !Number.isFinite(start)) {
          issues.push(`${label} has an invalid ${pos} position (${String(start)})`)
          continue
        }
        if (start < -BOUNDS_EPSILON) {
          issues.push(`${label} starts outside the box: ${pos} = ${start} is below 0`)
        }
        // skip if sizes are already broken
        if (boxIssues.length > 0 || itemIssues.length > 0) continue
        const end = start + item.dimensions[size]
        if (end > box.dimensions[size] + BOUNDS_EPSILON) {
          issues.push(
            `${label} extends outside the box: ${pos} + ${size} = ${end} exceeds box ${size} ${box.dimensions[size]}`,
          )
        }
      }
    })
  }

  if (issues.length > 0) {
    const summary = issues.length === 1 ? issues[0] : `${issues.length} packing problems found: ${issues[0]}; …`
    throw new NormaliseError(`Invalid packing result. ${summary}`, issues)
  }
  return result
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
    return validatePackingResult(fromPortalResult(raw))
  }

  if (Array.isArray(raw.results)) {
    return validatePackingResult(fromSolverOutput(raw as SolverOutput))
  }

  const keys = Object.keys(raw)
  throw new NormaliseError(
    `Unrecognised packing payload. Top-level keys: ${keys.length > 0 ? keys.join(', ') : '(none)'}`,
  )
}
