import * as THREE from 'three'

const GOLDEN_ANGLE = 137.508

// Distinct colour per item index, hues walk the golden angle
export const itemColour = (i: number) => {
  const hue = ((i * GOLDEN_ANGLE) % 360) / 360

  let light = 0.5
  if (i % 2 === 0) {
    light = 0.58
  }

  return new THREE.Color().setHSL(hue, 0.7, light, THREE.SRGBColorSpace)
}

export const itemColourCss = (i: number) => `#${itemColour(i).getHexString()}`
