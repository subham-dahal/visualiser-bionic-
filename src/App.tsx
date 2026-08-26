import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './App.css'

type Vec3 = { x: number; y: number; z: number }
type Dims = { w: number; h: number; d: number }

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

type AppProps = {
  /** A packing result already fetched by the host (e.g. FitPortal). Takes priority over orderId. */
  readonly result?: PackingResult
  /** If no result is given, fetch it ourselves from {apiBase}/api/orders/{orderId}/result. */
  readonly orderId?: string
  readonly apiBase?: string
}

// Placeholder scene shown when no result/orderId is supplied (standalone dev mode).
// Dimensions are in mm, same convention as a real PackingResult.
const DEMO_RESULT: PackingResult = {
  status: 'success',
  source: 'mock',
  unpacked: [],
  boxes: [
    {
      boxId: 'DEMO-MED',
      dimensions: { w: 2001, h: 2001, d: 2001 },
      items: [
        { itemId: 'Widget A', dimensions: { w: 500, h: 500, d: 500 }, position: { x: 0, y: 0, z: 0 } },
        { itemId: 'Widget B', dimensions: { w: 1000, h: 300, d: 800 }, position: { x: 500, y: 0, z: 200 } },
        { itemId: 'Fragile Glassware', dimensions: { w: 400, h: 800, d: 400 }, position: { x: 0, y: 500, z: 1000 } },
      ],
    },
  ],
}

const MM_TO_UNITS = 1 / 1000
const COLOURS = [0xff6600, 0x00cc44, 0xcc00ff, 0xffcc00, 0xff0055]
const hexToCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`

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

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1)
    keyLight.position.set(BOX.w * 2, BOX.h * 3, BOX.d * 2)
    scene.add(keyLight)

    const grid = new THREE.GridHelper(Math.max(BOX.w, BOX.d) * 3, 12, 0x2a2f3a, 0x1a1e26)
    grid.position.y = -0.001
    scene.add(grid)

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

    const meshes = box.items.map((item, i) => {
      const w = item.dimensions.w * MM_TO_UNITS
      const h = item.dimensions.h * MM_TO_UNITS
      const d = item.dimensions.d * MM_TO_UNITS
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: COLOURS[i % COLOURS.length] })
      )
      mesh.position.set(
        item.position.x * MM_TO_UNITS + w / 2 - BOX.w / 2,
        item.position.y * MM_TO_UNITS + h / 2 - BOX.h / 2,
        item.position.z * MM_TO_UNITS + d / 2 - BOX.d / 2
      )
      mesh.userData.index = i
      container.add(mesh)
      return mesh
    })

    const selectItem = (index: number | null) => {
      meshes.forEach((mesh, i) => {
        const material = mesh.material as THREE.MeshStandardMaterial
        const isSelected = i === index
        material.emissive.setHex(isSelected ? 0xffffff : 0x000000)
        material.emissiveIntensity = isSelected ? 0.5 : 0
        mesh.scale.setScalar(isSelected ? 1.08 : 1)
      })
      setSelected(index)
    }
    selectItemRef.current = selectItem

    camera.position.set(BOX.w * 1.8, BOX.h * 1.6, BOX.d * 2.2)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(BOX.w / 2, BOX.h / 2, BOX.d / 2)
    camera.lookAt(controls.target)
    controls.update()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const onPointerDown = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hit = raycaster.intersectObjects(meshes)[0]
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
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(animationId)
      resizeObserver.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      controls.dispose()
      renderer.domElement.remove()
      renderer.dispose()
    }
  }, [box])

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
          <p className="canvas-hint">Drag to rotate · scroll to zoom · tap an item to inspect</p>
        </main>
        <aside className="detail-region">
          <h2>Items in {box?.boxId}</h2>
          <ul className="item-list">
            {box?.items.map((item, i) => (
              <li key={`${item.itemId}-${i}`}>
                <button
                  type="button"
                  className={`item-row${selected === i ? ' is-selected' : ''}`}
                  onClick={() => selectItemRef.current(selected === i ? null : i)}
                >
                  <span className="item-swatch" style={{ backgroundColor: hexToCss(COLOURS[i % COLOURS.length]) }} />
                  <span className="item-name">{item.itemId}</span>
                  <span className="item-dims">
                    {item.dimensions.w} × {item.dimensions.h} × {item.dimensions.d} mm
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
