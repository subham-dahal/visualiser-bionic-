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
  /** Filled in by the scene so the item panel can highlight a group (or one item in it) in 3D */
  readonly selectItemRef: RefObject<(group: number | null, item?: number | null) => void>
  readonly onSelect: (group: number | null, item: number | null) => void
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
      width: box.dimensions.width * MM_TO_UNITS,
      depth: box.dimensions.depth * MM_TO_UNITS,
      length: box.dimensions.length * MM_TO_UNITS,
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
    keyLight.position.set(BOX.width * 2, BOX.depth * 3, BOX.length * 2)
    scene.add(keyLight)

    const grid = new THREE.GridHelper(Math.max(BOX.width, BOX.length) * 3, 12, 0x2a2f3a, 0x1a1e26)
    grid.position.y = -0.001
   // scene.add(grid)

    const container = new THREE.Mesh(
      new THREE.BoxGeometry(BOX.width, BOX.depth, BOX.length),
      new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.18, depthWrite: false })
    )
    container.position.set(BOX.width / 2, BOX.depth / 2, BOX.length / 2)
    container.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(container.geometry),
        new THREE.LineBasicMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.5 })
      )
    )
    scene.add(container)

    // Map each item index to its group index (used for selection and colour)
    const groupOf: number[] = []
    groups.forEach((group, g) => group.itemIndices.forEach((i) => (groupOf[i] = g)))

    const meshes = box.items.map((item, i) => {
      const width = item.dimensions.width * MM_TO_UNITS
      const depth = item.dimensions.depth * MM_TO_UNITS
      const length = item.dimensions.length * MM_TO_UNITS
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, depth, length),
        new THREE.MeshStandardMaterial({ color: itemColour(groups[groupOf[i]]!.colourIndex), transparent: true })
      )
      mesh.position.set(
        item.position.x * MM_TO_UNITS + width / 2 - BOX.width / 2,
        item.position.y * MM_TO_UNITS + depth / 2 - BOX.depth / 2,
        item.position.z * MM_TO_UNITS + length / 2 - BOX.length / 2
      )
      mesh.userData.index = groupOf[i]
      mesh.userData.itemIndex = i
      // Dark outline so neighbouring items (especially same-colour copies) stay distinct
      mesh.userData.outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: OUTLINE_COLOUR, transparent: true })
      )
      mesh.add(mesh.userData.outline)
      container.add(mesh)
      return mesh
    })

    // pass an item to highlight just that one, otherwise the whole group lights up
    const selectItem = (index: number | null, itemIndex: number | null = null) => {
      meshes.forEach((mesh) => {
        const material = mesh.material as THREE.MeshStandardMaterial
        const outline = (mesh.userData.outline as THREE.LineSegments).material as THREE.LineBasicMaterial
        const isSelected =
          itemIndex !== null ? mesh.userData.itemIndex === itemIndex : mesh.userData.index === index
        const isFaded = index !== null && !isSelected

        // Glow in the item's own colour so it brightens without washing out
        material.emissive.copy(isSelected ? material.color : new THREE.Color(0x000000))
        material.emissiveIntensity = isSelected ? SELECTED_GLOW : 0
        material.opacity = isFaded ? FADED_OPACITY : 1
        material.depthWrite = !isFaded

        outline.color.setHex(isSelected ? SELECTED_OUTLINE_COLOUR : OUTLINE_COLOUR)
        outline.opacity = isFaded ? FADED_OPACITY : 1
      })
      onSelect(index, index === null ? null : itemIndex)
    }
    selectItemRef.current = selectItem

    const initialCameraPos = new THREE.Vector3(BOX.width * 1.8, BOX.depth * 1.6, BOX.length * 2.2)
    const initialTarget = new THREE.Vector3(BOX.width / 2, BOX.depth / 2, BOX.length / 2)
    camera.position.copy(initialCameraPos)


    // Orbit Controls (Zoom in, rotate, panning is disabled because it feels clunky on mobile)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.copy(initialTarget)
    const diagonal = Math.hypot(BOX.width, BOX.depth, BOX.length)
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
      if (hit) selectItem(hit.object.userData.index as number, hit.object.userData.itemIndex as number)
      else selectItem(null)
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
