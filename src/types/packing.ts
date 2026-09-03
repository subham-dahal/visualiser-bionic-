export type Vec3 = { x: number; y: number; z: number }
export type Dims = { w: number; h: number; d: number }

export type PackedItem = {
  itemId: string
  dimensions: Dims
  position: Vec3
  rotation?: number
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
  boxes: PackedBox[]
}
