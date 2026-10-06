import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './App.css'
import type { PackedItem, PackingResult } from './types/packing'

export type { PackingResult, PackedBox, PackedItem } from './types/packing'

type AppProps = {
  /** A packing result already fetched by the host (e.g. FitPortal). Takes priority over orderId. */
  readonly result?: PackingResult
  /** If no result is given, fetch it ourselves from {apiBase}/api/orders/{orderId}/result. */
  readonly orderId?: string
  readonly apiBase?: string
}

// Placeholder scene shown when no result/orderId is supplied (standalone dev mode).
// Dimensions are in mm, same convention as a real PackingResult.
// Mix of repeated items to show grouping: same name + size share a row and colour,
// a rotated Shoebox still groups with the others, a larger Shoebox gets its own group.
const DEMO_RESULT: PackingResult = {
  status: 'success',
  source: 'mock',
  unpacked: [],
  boxes: [
    {
      boxId: 'DEMO',
      dimensions: { w: 1200, h: 600, d: 800 },
      items: [
        { itemId: 'Shoebox', dimensions: { w: 300, h: 150, d: 200 }, position: { x: 0, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 300, h: 150, d: 200 }, position: { x: 300, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 300, h: 150, d: 200 }, position: { x: 600, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 300, h: 150, d: 200 }, position: { x: 900, y: 0, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 200, h: 150, d: 300 }, position: { x: 600, y: 150, z: 0 } },
        { itemId: 'Shoebox', dimensions: { w: 400, h: 150, d: 250 }, position: { x: 500, y: 0, z: 200 } },
        { itemId: 'Kettle', dimensions: { w: 250, h: 300, d: 250 }, position: { x: 0, y: 0, z: 200 } },
        { itemId: 'Kettle', dimensions: { w: 250, h: 300, d: 250 }, position: { x: 250, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { w: 100, h: 120, d: 100 }, position: { x: 900, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { w: 100, h: 120, d: 100 }, position: { x: 1000, y: 0, z: 200 } },
        { itemId: 'Mug', dimensions: { w: 100, h: 120, d: 100 }, position: { x: 1100, y: 0, z: 200 } },
        { itemId: 'Book', dimensions: { w: 200, h: 40, d: 150 }, position: { x: 900, y: 150, z: 0 } },
        { itemId: 'Book', dimensions: { w: 200, h: 40, d: 150 }, position: { x: 900, y: 190, z: 0 } },
        { itemId: 'Fragile Glassware', dimensions: { w: 300, h: 400, d: 300 }, position: { x: 0, y: 0, z: 450 } },
      ],
    },
  ],
}

const MM_TO_UNITS = 1 / 1000
// Rotation per tap of an on-screen rotate button (15°)
const BUTTON_ANGLE_STEP = Math.PI / 12

// Selection styling
const OUTLINE_COLOUR = 0x0b0d12
const SELECTED_OUTLINE_COLOUR = 0xffffff
const SELECTED_GLOW = 0.25
const FADED_OPACITY = 0.3
const GOLDEN_ANGLE = 137.508

// Distinct colour per item index, hues walk the golden angle
const itemColour = (i: number) => {
  const hue = ((i * GOLDEN_ANGLE) % 360) / 360

  let light = 0.5
  if (i % 2 === 0) {
    light = 0.58
  }

  return new THREE.Color().setHSL(hue, 0.7, light, THREE.SRGBColorSpace)
}

const itemColourCss = (i: number) => `#${itemColour(i).getHexString()}`

// Items with the same name and size share a group (and so a colour).
// Dimensions are sorted so a rotated copy of the same item still matches.
type ItemGroup = {
  itemId: string
  dimensions: PackedItem['dimensions']
  items: PackedItem[]
  itemIndices: number[]
}

const groupKey = (item: PackedItem) => {
  const { w, h, d } = item.dimensions
  return `${item.itemId}|${[w, h, d].sort((a, b) => a - b).join('x')}`
}

const groupItems = (items: PackedItem[]) => {
  const groups = new Map<string, ItemGroup>()
  items.forEach((item, i) => {
    const key = groupKey(item)
    let group = groups.get(key)
    if (!group) {
      group = { itemId: item.itemId, dimensions: item.dimensions, items: [], itemIndices: [] }
      groups.set(key, group)
    }
    group.items.push(item)
    group.itemIndices.push(i)
  })
  return [...groups.values()]
}

async function fetchResult(path: string) {
  let token: string | null = null
  try {
    token = localStorage.getItem('fitportal.token')
  } catch {
    // storage can be unavailable (private mode, sandboxed embed) - fall back to no auth
  }
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`)
  return (data.result ?? data) as PackingResult
}

function App({ result: resultProp, orderId, apiBase = '' }: AppProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const selectItemRef = useRef<(index: number | null) => void>(() => {})
  const resetViewRef = useRef<() => void>(() => {})
  const zoomCameraRef = useRef<(factor: number) => void>(() => {})
  const rotateCameraRef = useRef<(deltaAzimuth: number, deltaPolar: number) => void>(() => {})
  const [selected, setSelected] = useState<number | null>(null)
  const [boxIndex, setBoxIndex] = useState(0)
  const [result, setResult] = useState<PackingResult | null>(resultProp ?? null)
  const [loading, setLoading] = useState(!resultProp && !!orderId)
  const [error, setError] = useState('')
  


  useEffect(() => {
    if (resultProp) {
      setResult(resultProp)
      return
    }
    if (!orderId) {
      setResult(DEMO_RESULT)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    fetchResult(`${apiBase}/api/orders/${orderId}/result`)
      .then((data) => {
        if (!cancelled) setResult(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [resultProp, orderId, apiBase])

  useEffect(() => {
    setBoxIndex(0)
    setSelected(null)
  }, [result])

  const box = result?.boxes?.[boxIndex]
  const groups = useMemo(() => groupItems(box?.items ?? []), [box])
  const selectedGroup = selected !== null ? groups[selected] : undefined

  const stepSelection = (delta: number) => {
    const count = groups.length
    if (count === 0) return
    const current = selected ?? -1
    selectItemRef.current((current + delta + count) % count)
  }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !box) return

    const BOX = {
      w: box.dimensions.w * MM_TO_UNITS,
      h: box.dimensions.h * MM_TO_UNITS,
      d: box.dimensions.d * MM_TO_UNITS,
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0d12)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)
    //scene.add(new THREE.AxesHelper(10))

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1)
    keyLight.position.set(BOX.w * 2, BOX.h * 3, BOX.d * 2)
    scene.add(keyLight)

    const grid = new THREE.GridHelper(Math.max(BOX.w, BOX.d) * 3, 12, 0x2a2f3a, 0x1a1e26)
    grid.position.y = -0.001
   // scene.add(grid)

    const container = new THREE.Mesh(
      new THREE.BoxGeometry(BOX.w, BOX.h, BOX.d),
      new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.18, depthWrite: false })
    )
    container.position.set(BOX.w / 2, BOX.h / 2, BOX.d / 2)
    container.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(container.geometry),
        new THREE.LineBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.5 })
      )
    )
    scene.add(container)

    // Map each item index to its group index so every copy shares a colour
    const groupOf: number[] = []
    groups.forEach((group, g) => group.itemIndices.forEach((i) => (groupOf[i] = g)))

    const meshes = box.items.map((item, i) => {
      const w = item.dimensions.w * MM_TO_UNITS
      const h = item.dimensions.h * MM_TO_UNITS
      const d = item.dimensions.d * MM_TO_UNITS
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: itemColour(groupOf[i]), transparent: true })
      )
      mesh.position.set(
        item.position.x * MM_TO_UNITS + w / 2 - BOX.w / 2,
        item.position.y * MM_TO_UNITS + h / 2 - BOX.h / 2,
        item.position.z * MM_TO_UNITS + d / 2 - BOX.d / 2
      )
      mesh.userData.index = groupOf[i]
      // Dark outline so neighbouring items (especially same-colour copies) stay distinct
      mesh.userData.outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: OUTLINE_COLOUR, transparent: true })
      )
      mesh.add(mesh.userData.outline)
      container.add(mesh)
      return mesh
    })

    const selectItem = (index: number | null) => {
      meshes.forEach((mesh) => {
        const material = mesh.material as THREE.MeshStandardMaterial
        const outline = (mesh.userData.outline as THREE.LineSegments).material as THREE.LineBasicMaterial
        const isSelected = mesh.userData.index === index
        const isFaded = index !== null && !isSelected

        // Glow in the item's own colour so it brightens without washing out
        material.emissive.copy(isSelected ? material.color : new THREE.Color(0x000000))
        material.emissiveIntensity = isSelected ? SELECTED_GLOW : 0
        material.opacity = isFaded ? FADED_OPACITY : 1
        material.depthWrite = !isFaded

        outline.color.setHex(isSelected ? SELECTED_OUTLINE_COLOUR : OUTLINE_COLOUR)
        outline.opacity = isFaded ? FADED_OPACITY : 1
      })
      setSelected(index)
    }
    selectItemRef.current = selectItem

    const initialCameraPos = new THREE.Vector3(BOX.w * 1.8, BOX.h * 1.6, BOX.d * 2.2)
    const initialTarget = new THREE.Vector3(BOX.w / 2, BOX.h / 2, BOX.d / 2)
    camera.position.copy(initialCameraPos)


    // Orbit Controls (Zoom in, rotate, panning is disabled because it feels clunky on mobile)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.copy(initialTarget)
    const diagonal = Math.hypot(BOX.w, BOX.h, BOX.d)
    controls.minDistance = diagonal * 1
    controls.maxDistance = diagonal * 1.9
    controls.enablePan = false
    camera.lookAt(controls.target)
    controls.update()

    const offset = new THREE.Vector3()
    const spherical = new THREE.Spherical()
    const targetSpherical = new THREE.Spherical()
    const ANGLE_STEP = 0.12
    const LERP_ALPHA = 0.1

    // Initialise both sphericals from the current camera position
    offset.copy(camera.position).sub(controls.target)
    spherical.setFromVector3(offset)
    targetSpherical.copy(spherical)

    const resetView = () => {
      camera.position.copy(initialCameraPos)
      controls.target.copy(initialTarget)
      offset.copy(initialCameraPos).sub(initialTarget)
      spherical.setFromVector3(offset)
      targetSpherical.copy(spherical)
      controls.update()
    }
    resetViewRef.current = resetView

    const rotateCamera = (deltaAzimuth: number, deltaPolar: number) => {
      offset.copy(camera.position).sub(controls.target)
      spherical.setFromVector3(offset)
      targetSpherical.copy(spherical)
      targetSpherical.theta += deltaAzimuth
      targetSpherical.phi = THREE.MathUtils.clamp(targetSpherical.phi + deltaPolar, 0.05, Math.PI - 0.05)
    }

    const zoomCamera = (factor: number) => {
      offset.copy(camera.position).sub(controls.target)
      spherical.setFromVector3(offset)
      targetSpherical.copy(spherical)
      targetSpherical.radius = THREE.MathUtils.clamp(spherical.radius * factor, controls.minDistance, controls.maxDistance)
    }
    zoomCameraRef.current = zoomCamera
    rotateCameraRef.current = rotateCamera

    const onKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          rotateCamera(-ANGLE_STEP, 0)
          break
        case 'ArrowRight':
          rotateCamera(ANGLE_STEP, 0)
          break
        case 'ArrowUp':
          rotateCamera(0, -ANGLE_STEP)
          break
        case 'ArrowDown':
          rotateCamera(0, ANGLE_STEP)
          break
        default:
          return
      }
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(meshes, false)[0]
      selectItem(hit ? (hit.object.userData.index as number) : null)
    }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(mount)

    let animationId: number
    const animate = () => {
      animationId = requestAnimationFrame(animate)

      const thetaDiff = targetSpherical.theta - spherical.theta
      const phiDiff = targetSpherical.phi - spherical.phi
      const radiusDiff = targetSpherical.radius - spherical.radius

      if (Math.abs(thetaDiff) > 0.0001 || Math.abs(phiDiff) > 0.0001 || Math.abs(radiusDiff) > 0.0001) {
        spherical.theta += thetaDiff * LERP_ALPHA
        spherical.phi += phiDiff * LERP_ALPHA
        spherical.radius += radiusDiff * LERP_ALPHA
        offset.setFromSpherical(spherical)
        camera.position.copy(controls.target).add(offset)
      } else {
        // Sync our state from camera so OrbitControls mouse drag works freely
        offset.copy(camera.position).sub(controls.target)
        spherical.setFromVector3(offset)
        targetSpherical.copy(spherical)
      }

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      controls.dispose()
      renderer.domElement.remove()
      renderer.dispose()
    }
  }, [box, groups])

  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Bionic Visualiser</h1>
        </header>
        <p className="app-status">Loading packing result…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Bionic Visualiser</h1>
        </header>
        <p className="app-status app-status--error">{error}</p>
      </div>
    )
  }

  if (result?.status !== 'success' || !result?.boxes?.length) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Bionic Visualiser</h1>
        </header>
        <p className="app-status">{result?.message || 'No packing result to display yet.'}</p>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bionic Visualiser</h1>
        <p className="app-subtitle">
          Packing layout preview{result.source === 'mock' && ' · mock solver'}
        </p>
      </header>

      {result.boxes.length > 1 && (
        <nav className="box-tabs">
          {result.boxes.map((b, i) => (
            <button
              key={b.boxId}
              type="button"
              className={`box-tab${i === boxIndex ? ' is-active' : ''}`}
              onClick={() => setBoxIndex(i)}
            >
              {b.boxId} · {b.items.length} items
            </button>
          ))}
        </nav>
      )}

      <div className="app-body">
        <main className="canvas-region">
          <div ref={mountRef} className="canvas-mount" />
          <div className="camera-controls">
            <button type="button" className="camera-btn" aria-label="Zoom in" onClick={() => zoomCameraRef.current(0.8)}>
              +
            </button>
            <button type="button" className="camera-btn" aria-label="Zoom out" onClick={() => zoomCameraRef.current(1.25)}>
              −
            </button>
            <button type="button" className="camera-btn camera-btn--reset" onClick={() => resetViewRef.current()}>
              Reset view
            </button>
          </div>
          <div className="rotate-pad" role="group" aria-label="Rotate view">
            <button
              type="button"
              className="camera-btn rotate-pad__up"
              aria-label="Rotate up"
              onClick={() => rotateCameraRef.current(0, -BUTTON_ANGLE_STEP)}
            >
              ▲
            </button>
            <button
              type="button"
              className="camera-btn rotate-pad__left"
              aria-label="Rotate left"
              onClick={() => rotateCameraRef.current(-BUTTON_ANGLE_STEP, 0)}
            >
              ◀
            </button>
            <button
              type="button"
              className="camera-btn rotate-pad__right"
              aria-label="Rotate right"
              onClick={() => rotateCameraRef.current(BUTTON_ANGLE_STEP, 0)}
            >
              ▶
            </button>
            <button
              type="button"
              className="camera-btn rotate-pad__down"
              aria-label="Rotate down"
              onClick={() => rotateCameraRef.current(0, BUTTON_ANGLE_STEP)}
            >
              ▼
            </button>
          </div>
          <p className="canvas-hint">Drag, arrow keys or buttons to rotate</p>
        </main>
        <aside className="detail-region">
          <h2>Items in {box?.boxId}</h2>
          {selectedGroup && selected !== null ? (
            <div className="item-detail">
              <p className="item-detail__name">
                {selectedGroup.itemId}
                {selectedGroup.items.length > 1 && ` × ${selectedGroup.items.length}`}
              </p>
              <dl className="item-detail__specs">
                <dt>Colour</dt>
                <dd className="item-detail__colour">
                  <span className="item-swatch" style={{ background: itemColourCss(selected) }} aria-hidden="true" />
                  {itemColourCss(selected)}
                </dd>
                <dt>Quantity</dt>
                <dd>{selectedGroup.items.length}</dd>
                <dt>Size</dt>
                <dd>
                  {selectedGroup.dimensions.w} × {selectedGroup.dimensions.h} × {selectedGroup.dimensions.d} mm
                </dd>
                <dt>{selectedGroup.items.length > 1 ? 'Positions' : 'Position'}</dt>
                <dd>
                  {selectedGroup.items.map((item, i) => (
                    <div key={i}>
                      x {item.position.x} · y {item.position.y} · z {item.position.z} mm
                      {item.rotation ? ` · ${item.rotation}°` : ''}
                    </div>
                  ))}
                </dd>
              </dl>
            </div>
          ) : (
            <p className="item-hint">Select an item below, or in the 3D view.</p>
          )}
          <div className="item-nav">
            <button type="button" className="item-nav__btn" onClick={() => stepSelection(-1)}>
              ‹ Prev
            </button>
            <span className="item-nav__pos">
              {selected !== null ? selected + 1 : '–'} / {groups.length}
            </span>
            <button type="button" className="item-nav__btn" onClick={() => stepSelection(1)}>
              Next ›
            </button>
          </div>
          <ul className="item-list">
            {groups.map((group, g) => (
              <li key={`${group.itemId}-${g}`}>
                <button
                  type="button"
                  className={`item-row${selected === g ? ' is-selected' : ''}`}
                  onClick={() => selectItemRef.current(selected === g ? null : g)}
                >
                  <span className="item-swatch" style={{ background: itemColourCss(g) }} aria-hidden="true" />
                  <span className="item-name">
                    {group.itemId}
                    {group.items.length > 1 && <span className="item-qty"> × {group.items.length}</span>}
                  </span>
                  <span className="item-dims">
                    {group.dimensions.w} × {group.dimensions.h} × {group.dimensions.d} mm
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!!result.unpacked?.length && (
            <p className="unpacked-note">
              {result.unpacked.length} item(s) did not fit: {result.unpacked.join(', ')}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

export default App
