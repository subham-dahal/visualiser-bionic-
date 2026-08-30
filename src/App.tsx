import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import './App.css'

const children = [
  { w: 0.5, h: 0.5, d: 0.5, x: 0,   y: 0,   z: 0   },
  { w: 1.0, h: 0.3, d: 0.8, x: 0.5, y: 0,   z: 0.2 },
  { w: 0.4, h: 0.8, d: 0.4, x: 0,   y: 0.5, z: 1.0 },
]

const colours = [0xff6600, 0x00cc44, 0xcc00ff, 0xffcc00, 0xff0055]

const BoxSize = { w: 2.001, h: 2.001, d: 2.001 }

function App() {
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
      cube.add(mesh)
    })

    scene.add(new THREE.AxesHelper(10))

    camera.position.set(BoxSize.w * 2, BoxSize.h * 2, BoxSize.d * 2)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(BoxSize.w / 2, BoxSize.h / 2, BoxSize.d / 2)

    const halfDiagonal = 0.5 * Math.hypot(BoxSize.w, BoxSize.h, BoxSize.d)
    controls.minDistance = halfDiagonal * 2   //stop camera entering the box
    controls.maxDistance = halfDiagonal * 5   //stop infinite zoom out



    controls.update()

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
      renderer.dispose()
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bionic Visualiser</h1>
      </header>
      <main className="canvas-region">
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      </main>
      <aside className="detail-region">
        {/* Item Detail Panel */}
      </aside>
    </div>
  )
}

export default App