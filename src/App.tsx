import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './App.css'

type Item = {
  name: string
  w: number
  h: number
  d: number
  x: number
  y: number
  z: number
}

const ITEMS: Item[] = [
  { name: 'Widget A', w: 0.5, h: 0.5, d: 0.5, x: 0, y: 0, z: 0 },
  { name: 'Widget B', w: 1.0, h: 0.3, d: 0.8, x: 0.5, y: 0, z: 0.2 },
  { name: 'Fragile Glassware', w: 0.4, h: 0.8, d: 0.4, x: 0, y: 0.5, z: 1.0 },
]

const COLOURS = [0xff6600, 0x00cc44, 0xcc00ff, 0xffcc00, 0xff0055]
const hexToCss = (hex: number) => `#${hex.toString(16).padStart(6, '0')}`

const BOX = { w: 2.001, h: 2.001, d: 2.001 }

function App() {
  const mountRef = useRef<HTMLDivElement>(null)
  const selectItemRef = useRef<(index: number | null) => void>(() => {})
  const [selected, setSelected] = useState<number | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0b0d12)

    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.7))
    const keyLight = new THREE.DirectionalLight(0xffffff, 1)
    keyLight.position.set(4, 6, 4)
    scene.add(keyLight)

    const grid = new THREE.GridHelper(6, 12, 0x2a2f3a, 0x1a1e26)
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

    const meshes = ITEMS.map((item, i) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(item.w, item.h, item.d),
        new THREE.MeshStandardMaterial({ color: COLOURS[i % COLOURS.length] })
      )
      mesh.position.set(
        item.x + item.w / 2 - BOX.w / 2,
        item.y + item.h / 2 - BOX.h / 2,
        item.z + item.d / 2 - BOX.d / 2
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
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bionic Visualiser</h1>
        <p className="app-subtitle">Packing layout preview · Sprint 1 prototype</p>
      </header>
      <div className="app-body">
        <main className="canvas-region">
          <div ref={mountRef} className="canvas-mount" />
          <p className="canvas-hint">Drag to rotate · scroll to zoom · tap an item to inspect</p>
        </main>
        <aside className="detail-region">
          <h2>Items in this container</h2>
          <ul className="item-list">
            {ITEMS.map((item, i) => (
              <li key={item.name}>
                <button
                  type="button"
                  className={`item-row${selected === i ? ' is-selected' : ''}`}
                  onClick={() => selectItemRef.current(selected === i ? null : i)}
                >
                  <span className="item-swatch" style={{ backgroundColor: hexToCss(COLOURS[i % COLOURS.length]) }} />
                  <span className="item-name">{item.name}</span>
                  <span className="item-dims">
                    {item.w} × {item.h} × {item.d} (demo units)
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

export default App
