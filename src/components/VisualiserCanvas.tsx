import { useEffect, useRef, type RefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { PackedBox } from '../types/packing'
import type { ItemGroup } from '../utils/grouping'
import { itemColour } from '../utils/colours'
import CameraControls from './CameraControls'

const MM_TO_UNITS = 1 / 1000

// Selection styling
const OUTLINE_COLOUR = 0x0b0d12
const SELECTED_OUTLINE_COLOUR = 0xffffff
const SELECTED_GLOW = 0.25
const FADED_OPACITY = 0.3

type VisualiserCanvasProps = {
  readonly box: PackedBox
  readonly groups: ItemGroup[]
  /** Filled in by the scene so the item panel can highlight a group in 3D */
  readonly selectItemRef: RefObject<(index: number | null) => void>
  readonly onSelect: (index: number | null) => void
}

function VisualiserCanvas({ box, groups, selectItemRef, onSelect }: VisualiserCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const resetViewRef = useRef<() => void>(() => {})
  const zoomCameraRef = useRef<(factor: number) => void>(() => {})
  const rotateCameraRef = useRef<(deltaAzimuth: number, deltaPolar: number) => void>(() => {})

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const BOX = {
      w: box.dimensions.w * MM_TO_UNITS,
      h: box.dimensions.d * MM_TO_UNITS,
      d: box.dimensions.l * MM_TO_UNITS,
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
      const d = item.dimensions.d * MM_TO_UNITS
      const l = item.dimensions.l * MM_TO_UNITS
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, d, l),
        new THREE.MeshStandardMaterial({ color: itemColour(groupOf[i]), transparent: true })
      )
      mesh.position.set(
        item.position.x * MM_TO_UNITS + w / 2 - BOX.w / 2,
        item.position.y * MM_TO_UNITS + d / 2 - BOX.h / 2,
        item.position.z * MM_TO_UNITS + l / 2 - BOX.d / 2
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
      onSelect(index)
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
  }, [box, groups, selectItemRef, onSelect])

  return (
    <main className="canvas-region">
      <div ref={mountRef} className="canvas-mount" />
      <CameraControls
        onZoom={(factor) => zoomCameraRef.current(factor)}
        onReset={() => resetViewRef.current()}
        onRotate={(deltaAzimuth, deltaPolar) => rotateCameraRef.current(deltaAzimuth, deltaPolar)}
      />
      <p className="canvas-hint">Drag, arrow keys or buttons to rotate</p>
    </main>
  )
}

export default VisualiserCanvas
