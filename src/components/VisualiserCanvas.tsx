import { useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { PackedBox } from '../types/packing'
import type { ItemGroup } from '../utils/grouping'
import { itemColour } from '../utils/colours'
import CameraControls from './CameraControls'
import PackingSteps, { type PackingProgress, type PackingStepsControls } from './PackingSteps'
import { packingOrder } from '../utils/packingOrder'
import { refOf } from '../utils/grouping'

const MM_TO_UNITS = 1 / 1000

// Selection styling
const OUTLINE_COLOUR = 0x0b0d12
const SELECTED_OUTLINE_COLOUR = 0xffffff
const SELECTED_GLOW = 0.25
const FADED_OPACITY = 0.3

// Step-by-step packing: each item lowers in from above the box, then a short pause before the next
const FALL_MS = 1400
const STEP_GAP_MS = 350
const GHOST_COLOUR = 0xffffff
// While stepping, everything except the item being placed is greyed out
const PLACED_GREY = 0x5b616e
const PLACED_OPACITY = 0.55

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

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
  const stepsRef = useRef<PackingStepsControls>({ play() {}, pause() {}, next() {}, prev() {}, showAll() {} })
  const [progress, setProgress] = useState<PackingProgress>({ shown: 0, total: 0, playing: false, current: null })

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
      mesh.userData.colour = (mesh.material as THREE.MeshStandardMaterial).color.clone()
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

    // One place that decides how every item looks, from the current selection and the
    // packing step in focus (the item being placed, or null when the whole box is shown)
    let selection: { index: number | null; itemIndex: number | null } = { index: null, itemIndex: null }
    let focus: number | null = null
    const black = new THREE.Color(0x000000)

    const applyStyles = () => {
      meshes.forEach((mesh, i) => {
        const material = mesh.material as THREE.MeshStandardMaterial
        const outline = (mesh.userData.outline as THREE.LineSegments).material as THREE.LineBasicMaterial
        const isSelected =
          selection.itemIndex !== null ? i === selection.itemIndex : mesh.userData.index === selection.index
        const isFaded = selection.index !== null && !isSelected
        const isGreyed = focus !== null && i !== focus && !isSelected
        let opacity = 1
        if (isFaded) opacity = FADED_OPACITY
        else if (isGreyed) opacity = PLACED_OPACITY

        material.color.copy(isGreyed ? new THREE.Color(PLACED_GREY) : (mesh.userData.colour as THREE.Color))
        // Glow in the item's own colour so it brightens without washing out
        material.emissive.copy(isSelected ? material.color : black)
        material.emissiveIntensity = isSelected ? SELECTED_GLOW : 0
        material.opacity = opacity
        material.depthWrite = opacity === 1

        outline.color.setHex(isSelected ? SELECTED_OUTLINE_COLOUR : OUTLINE_COLOUR)
        outline.opacity = opacity
      })
    }

    // pass an item to highlight just that one, otherwise the whole group lights up
    const selectItem = (index: number | null, itemIndex: number | null = null) => {
      selection = { index, itemIndex: index === null ? null : itemIndex }
      applyStyles()
      onSelect(selection.index, selection.itemIndex)
    }

    // Dashed outline marking where the falling item will land
    const ghostMaterial = new THREE.LineDashedMaterial({
      color: GHOST_COLOUR,
      dashSize: 0.01,
      gapSize: 0.008,
      transparent: true,
      opacity: 0.7,
    })
    const ghosts = meshes.map((mesh) => {
      const ghost = new THREE.LineSegments((mesh.userData.outline as THREE.LineSegments).geometry, ghostMaterial)
      ghost.computeLineDistances()
      ghost.position.copy(mesh.position)
      ghost.visible = false
      container.add(ghost)
      return ghost
    })

    // Step-by-step packing. `placed` items sit in their slot; while `falling` is set,
    // that item (order[placed]) is lowering in from above the box.
    const order = packingOrder(box.items)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const restY = meshes.map((mesh) => mesh.position.y)
    const dropY = meshes.map(
      (_, i) => BOX.depth / 2 + (box.items[i]!.dimensions.depth * MM_TO_UNITS) / 2 + BOX.depth * 0.6
    )
    let placed = order.length
    let falling = false
    let fallStart = 0
    let playing = false
    let nextStepAt = 0
    let lastProgress = ''

    const emitProgress = () => {
      const shown = placed + (falling ? 1 : 0)
      const showingAll = placed === order.length && !playing
      const focusIndex = showingAll || shown === 0 ? null : order[shown - 1]!
      if (focusIndex !== focus) {
        focus = focusIndex
        applyStyles()
      }
      const item = focusIndex === null ? null : box.items[focusIndex]!
      // "Shoebox 3 (SHOEBOX)", or just the code when it's the same as the reference
      const current = item && (refOf(item) === item.itemId ? item.itemId : `${item.itemId} (${refOf(item)})`)
      const next: PackingProgress = { shown, total: order.length, playing, current }
      const key = JSON.stringify(next)
      if (key !== lastProgress) {
        lastProgress = key
        setProgress(next)
      }
    }

    const setPlaced = (count: number) => {
      falling = false
      placed = count
      order.forEach((i, step) => {
        meshes[i]!.visible = step < count
        meshes[i]!.position.y = restY[i]!
        ghosts[i]!.visible = false
      })
      emitProgress()
    }

    const startFall = (now: number) => {
      const i = order[placed]!
      falling = true
      fallStart = now
      meshes[i]!.position.y = dropY[i]!
      meshes[i]!.visible = true
      ghosts[i]!.visible = true
      emitProgress()
    }

    const land = (now: number) => {
      const i = order[placed]!
      meshes[i]!.position.y = restY[i]!
      ghosts[i]!.visible = false
      falling = false
      placed += 1
      nextStepAt = now + STEP_GAP_MS
      if (placed === order.length) playing = false
      emitProgress()
    }

    const updateFall = (now: number) => {
      if (falling) {
        const i = order[placed]!
        const t = reduceMotion ? 1 : Math.min((now - fallStart) / FALL_MS, 1)
        meshes[i]!.position.y = dropY[i]! + (restY[i]! - dropY[i]!) * easeOutCubic(t)
        if (t >= 1) land(now)
      } else if (playing && now >= nextStepAt && placed < order.length) {
        startFall(now)
      }
    }

    stepsRef.current = {
      play: () => {
        if (placed === order.length) setPlaced(0)
        playing = true
        nextStepAt = performance.now()
        emitProgress()
      },
      // The item already falling still lands, so nothing is left hanging mid-air
      pause: () => {
        playing = false
        emitProgress()
      },
      next: () => {
        playing = false
        if (falling) land(performance.now())
        else if (placed < order.length) startFall(performance.now())
        emitProgress()
      },
      prev: () => {
        playing = false
        setPlaced(Math.max(placed - (falling ? 0 : 1), 0))
      },
      showAll: () => {
        playing = false
        setPlaced(order.length)
      },
    }
    emitProgress()

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
      const hit = raycaster.intersectObjects(meshes.filter((mesh) => mesh.visible), false)[0]
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
      updateFall(performance.now())

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
      <PackingSteps
        progress={progress}
        controls={{
          play: () => stepsRef.current.play(),
          pause: () => stepsRef.current.pause(),
          next: () => stepsRef.current.next(),
          prev: () => stepsRef.current.prev(),
          showAll: () => stepsRef.current.showAll(),
        }}
      />
      <CameraControls
        onZoom={(factor) => zoomCameraRef.current(factor)}
        onReset={() => resetViewRef.current()}
        onRotate={(deltaAzimuth, deltaPolar) => rotateCameraRef.current(deltaAzimuth, deltaPolar)}
      />
      <p className="canvas-hint">Drag, arrow keys or buttons to rotate · Play to watch it packed step by step</p>
    </main>
  )
}

export default VisualiserCanvas
