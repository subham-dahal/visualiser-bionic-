import type { ItemGroup } from '../utils/grouping'
import { itemColourCss } from '../utils/colours'

type ItemPanelProps = {
  readonly boxId: string
  readonly groups: ItemGroup[]
  readonly selected: number | null
  readonly onSelect: (index: number | null) => void
  readonly unpacked?: string[]
}

// Side panel: details of the selected group, prev/next, and the list of every group in the box
function ItemPanel({ boxId, groups, selected, onSelect, unpacked }: ItemPanelProps) {
  const selectedGroup = selected !== null ? groups[selected] : undefined

  const stepSelection = (delta: number) => {
    const count = groups.length
    if (count === 0) return
    const current = selected ?? -1
    onSelect((current + delta + count) % count)
  }

  return (
    <aside className="detail-region">
      <h2>Items in {boxId}</h2>
      {selectedGroup && selected !== null ? (
        <div className="item-detail">
          <p className="item-detail__name">
            {selectedGroup.itemId}
            {selectedGroup.items.length > 1 && ` × ${selectedGroup.items.length}`}
          </p>
          <dl className="item-detail__specs">
            <dt>Colour:</dt>
            <dd className="item-detail__colour">
              <span className="item-swatch" style={{ background: itemColourCss(selected) }} aria-hidden="true" />
              {itemColourCss(selected)}
            </dd>
            <dt>Quantity:</dt>
            <dd>{selectedGroup.items.length}</dd>
            <dt>Size:</dt>
            <dd>
              {selectedGroup.dimensions.w} × {selectedGroup.dimensions.d} × {selectedGroup.dimensions.l} mm
            </dd>
            <dt>{selectedGroup.items.length > 1 ? 'Positions:' : 'Position:'}</dt>
            <dd>
              {selectedGroup.items.map((item, i) => (
                <div key={i}>
                  x {item.position.x} · y {item.position.y} · z {item.position.z} mm
                  {item.rotation ? ` · ${item.rotation}°` : ''}
                </div>
              ))}
            </dd>
          </dl>
        </div>
      ) : (
        <p className="item-hint">Select an item below, or in the 3D view.</p>
      )}
      <div className="item-nav">
        <button type="button" className="item-nav__btn" onClick={() => stepSelection(-1)}>
          ‹ Prev
        </button>
        <span className="item-nav__pos">
          {selected !== null ? selected + 1 : '–'} / {groups.length}
        </span>
        <button type="button" className="item-nav__btn" onClick={() => stepSelection(1)}>
          Next ›
        </button>
      </div>
      <ul className="item-list">
        {groups.map((group, g) => (
          <li key={`${group.itemId}-${g}`}>
            <button
              type="button"
              className={`item-row${selected === g ? ' is-selected' : ''}`}
              onClick={() => onSelect(selected === g ? null : g)}
            >
              <span className="item-swatch" style={{ background: itemColourCss(g) }} aria-hidden="true" />
              <span className="item-name">
                {group.itemId}
                {group.items.length > 1 && <span className="item-qty"> × {group.items.length}</span>}
              </span>
              <span className="item-dims">
                {group.dimensions.w} × {group.dimensions.d} × {group.dimensions.l} mm
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!!unpacked?.length && (
        <p className="unpacked-note">
          {unpacked.length} item(s) did not fit: {unpacked.join(', ')}
        </p>
      )}
    </aside>
  )
}

export default ItemPanel
