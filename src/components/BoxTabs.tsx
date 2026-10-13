import type { PackedBox } from '../types/packing'

type BoxTabsProps = {
  readonly boxes: PackedBox[]
  readonly activeIndex: number
  readonly onSelect: (index: number) => void
}

// One tab per box, only shown when the result has more than one
function BoxTabs({ boxes, activeIndex, onSelect }: BoxTabsProps) {
  if (boxes.length <= 1) return null

  return (
    <nav className="box-tabs">
      {boxes.map((b, i) => (
        <button
          key={b.boxId}
          type="button"
          className={`box-tab${i === activeIndex ? ' is-active' : ''}`}
          onClick={() => onSelect(i)}
        >
          {b.boxId} · {b.items.length} items
        </button>
      ))}
    </nav>
  )
}

export default BoxTabs
