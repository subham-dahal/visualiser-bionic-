import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { itemColour, itemColourCss } from '../colours'

const hsl = (i: number) => {
  const out = { h: 0, s: 0, l: 0 }
  itemColour(i).getHSL(out, THREE.SRGBColorSpace)
  return out
}

// itemColour: each group index gets a stable, distinct colour
describe('itemColour', () => {
  it('returns a THREE.Color', () => {
    expect(itemColour(0)).toBeInstanceOf(THREE.Color)
  })

  it('is deterministic for the same index', () => {
    expect(itemColour(7).getHex()).toBe(itemColour(7).getHex())
  })

  it('walks hue by the golden angle', () => {
    expect(hsl(0).h).toBeCloseTo(0, 3)
    expect(hsl(1).h).toBeCloseTo(137.508 / 360, 3)
    expect(hsl(3).h).toBeCloseTo(((3 * 137.508) % 360) / 360, 3)
  })

  it('uses a lighter shade for even indices than odd ones', () => {
    expect(hsl(2).l).toBeCloseTo(0.58, 2)
    expect(hsl(3).l).toBeCloseTo(0.5, 2)
  })

  it('gives the first 20 groups 20 distinct colours', () => {
    const hexes = Array.from({ length: 20 }, (_, i) => itemColour(i).getHex())
    expect(new Set(hexes).size).toBe(20)
  })
})

// itemColourCss: the same colour as a CSS hex string for the item panel swatches
describe('itemColourCss', () => {
  it('formats as a 7-character lowercase hex string', () => {
    for (const i of [0, 1, 5, 42]) {
      expect(itemColourCss(i)).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('matches the swatch to the 3D mesh colour', () => {
    expect(itemColourCss(4)).toBe(`#${itemColour(4).getHexString()}`)
  })
})
