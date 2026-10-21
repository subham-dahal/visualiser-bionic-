import './packingSteps.css'

export type PackingProgress = {
  /** How many items are in the box so far, counting the one that's falling */
  readonly shown: number
  readonly total: number
  readonly playing: boolean
  /** Name of the item falling in (or the last one placed) */
  readonly current: string | null
}

export type PackingStepsControls = {
  play: () => void
  pause: () => void
  next: () => void
  prev: () => void
  showAll: () => void
}

type PackingStepsProps = {
  readonly progress: PackingProgress
  readonly controls: PackingStepsControls
}

// Playback bar for the step-by-step packing animation, top-left of the canvas
function PackingSteps({ progress, controls }: PackingStepsProps) {
  const { shown, total, playing, current } = progress
  if (total === 0) return null
  const finished = shown === total
  let playLabel = '▶ Play'
  if (playing) playLabel = '❚❚ Pause'
  else if (finished) playLabel = '▶ Play packing'

  return (
    <div className="packing-steps" role="group" aria-label="Packing steps">
      <button
        type="button"
        className="camera-btn packing-steps__play"
        onClick={playing ? controls.pause : controls.play}
      >
        {playLabel}
      </button>
      <button type="button" className="camera-btn" aria-label="Previous step" onClick={controls.prev} disabled={shown === 0}>
        ‹
      </button>
      <button type="button" className="camera-btn" aria-label="Next step" onClick={controls.next} disabled={finished}>
        ›
      </button>
      {!finished && (
        <button type="button" className="camera-btn packing-steps__all" onClick={controls.showAll}>
          Show all
        </button>
      )}
      <span className="packing-steps__label" aria-live="polite">
        Step {shown} / {total}
        {current ? ` · ${current}` : ''}
      </span>
    </div>
  )
}

export default PackingSteps
