import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './App.css'


//boxes now have ids
const children = [
  { id: "item-1", w: 0.5, h: 0.5, d: 0.5, x: 0,   y: 0,   z: 0   },
  { id: "item-2", w: 1.0, h: 0.3, d: 0.8, x: 0.5, y: 0,   z: 0.2 },
  { id: "item-3", w: 0.4, h: 0.8, d: 0.4, x: 0,   y: 0.5, z: 1.0 },
]

const colours = [0xff6600, 0x00cc44, 0xcc00ff, 0xffcc00, 0xff0055]
const BoxSize = { w: 2.001, h: 2.001, d: 2.001 }

function App() {

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const itemMeshRef = useRef<THREE.Mesh[]>([])
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })

    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(BoxSize.w, BoxSize.h, BoxSize.d),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.3, depthWrite: false })
    )
    cube.position.set(BoxSize.w / 2, BoxSize.h / 2, BoxSize.d / 2)
    scene.add(cube)

    children.forEach((item, i) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(item.w, item.h, item.d),
        new THREE.MeshBasicMaterial({ color: colours[i % colours.length], transparent: true, opacity: 0.7 })
      )
      mesh.position.set(
        item.x + item.w / 2 - BoxSize.w / 2,
        item.y + item.h / 2 - BoxSize.h / 2,
        item.z + item.d / 2 - BoxSize.d / 2
      )
      mesh.userData.id = item.id
      cube.add(mesh)
      itemMeshRef.current.push(mesh)
    })

    scene.add(new THREE.AxesHelper(10))

    camera.position.set(BoxSize.w * 2, BoxSize.h * 2, BoxSize.d * 2)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(BoxSize.w / 2, BoxSize.h / 2, BoxSize.d / 2)

    const halfDiagonal = 0.5 * Math.hypot(BoxSize.w, BoxSize.h, BoxSize.d)
    controls.minDistance = halfDiagonal * 1   //stop camera entering the box
    controls.maxDistance = halfDiagonal * 5   //stop infinite zoom out
    controls.enablePan = false
    controls.update()

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let downX = 0, downY = 0

    const onMouseDown = (e: PointerEvent) => {
      downX = e.clientX
      downY = e.clientY
    }

    const onMouseUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 5) return

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1 

      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(itemMeshRef.current, false)

      //click on box passes value to selectedId, getting id of box, click else where it returns null
      if (hits.length > 0) {
        setSelectedId(hits[0].object.userData.id)
      } else {
        setSelectedId(null)
      }
    }

    renderer.domElement.addEventListener('pointerdown', onMouseDown)
    renderer.domElement.addEventListener('pointerup', onMouseUp)


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
      controls.dispose()
      mount.removeChild(renderer.domElement)
      renderer.domElement.removeEventListener('pointerdown', onMouseDown)
      renderer.domElement.removeEventListener('pointerup', onMouseUp)
      itemMeshRef.current = []
      renderer.dispose()
    }
  }, [])

  
   let selectedItem = null
   for (const item of children) {
    if (item.id === selectedId) {
      selectedItem = item
      break
    }
   }

   return (
    <div className="app">
      <header className="app-header">
        <h1>Bionic Visualiser</h1>
        <p className="app-subtitle">Interactive 3D Visualization</p>
      </header>

      <div className="app-body">
        <main className="canvas-region">
          <div ref={mountRef} className="canvas-mount" />
        </main>

        <aside className="detail-region">
          <h2>Items</h2>

          {selectedItem ? (
            <div>
              <h3>{selectedItem.id}</h3>
              <p>Size: {selectedItem.w} x {selectedItem.h} x {selectedItem.d}</p>
              <p>Position: {selectedItem.x} x {selectedItem.y} x {selectedItem.z}</p>
            </div>
          ) : (
            <p>View an item's details by clicking or tapping.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

export default App