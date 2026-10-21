// Rotation per tap of an on-screen rotate button (15°)
const BUTTON_ANGLE_STEP = Math.PI / 12

type CameraControlsProps = {
  readonly onZoom: (factor: number) => void
  readonly onReset: () => void
  readonly onRotate: (deltaAzimuth: number, deltaPolar: number) => void
}

function CameraControls({ onZoom, onReset, onRotate }: CameraControlsProps) {
  return (
    <>
      <div className="camera-controls">
        <button type="button" className="camera-btn" aria-label="Zoom in" onClick={() => onZoom(0.8)}>
          +
        </button>
        <button type="button" className="camera-btn" aria-label="Zoom out" onClick={() => onZoom(1.25)}>
          −
        </button>
        <button type="button" className="camera-btn camera-btn--reset" onClick={onReset}>
          Reset view
        </button>
      </div>
      <div className="rotate-pad" role="group" aria-label="Rotate view">
        <button
          type="button"
          className="camera-btn rotate-pad__up"
          aria-label="Rotate up"
          onClick={() => onRotate(0, -BUTTON_ANGLE_STEP)}
        >
          ▲
        </button>
        <button
          type="button"
          className="camera-btn rotate-pad__left"
          aria-label="Rotate left"
          onClick={() => onRotate(-BUTTON_ANGLE_STEP, 0)}
        >
          ◀
        </button>
        <button
          type="button"
          className="camera-btn rotate-pad__right"
          aria-label="Rotate right"
          onClick={() => onRotate(BUTTON_ANGLE_STEP, 0)}
        >
          ▶
        </button>
        <button
          type="button"
          className="camera-btn rotate-pad__down"
          aria-label="Rotate down"
          onClick={() => onRotate(0, BUTTON_ANGLE_STEP)}
        >
          ▼
        </button>
      </div>
    </>
  )
}

export default CameraControls
