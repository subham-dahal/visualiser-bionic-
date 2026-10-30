export type Vec3 = { x: number; y: number; z: number }
export type Dims = { width: number; depth: number; length: number }

export type PackedItem = {
  itemId: string
  // items with the same ref and size get the same colour
  itemReference?: string
  dimensions: Dims
  position: Vec3
  /** Axis order the item was rotated into, as sent by Portal (e.g. "XYZ", "ZXY"). */
  rotation?: string
}

export type PackedBox = {
  boxId: string
  dimensions: Dims
  items: PackedItem[]
}

export type PackingResult = {
  status: 'success' | 'error'
  source: 'bionic-solver' | 'mock'
  solverMs?: number
  message?: string
  unpacked?: string[]
  orderId?: string
  reference?: string
  boxes: PackedBox[]
}
