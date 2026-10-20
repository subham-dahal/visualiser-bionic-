import type { ItemGroup } from '../utils/grouping'
import { itemColourCss } from '../utils/colours'

type ItemPanelProps = {
  readonly boxId: string
  readonly groups: ItemGroup[]
  readonly selected: number | null
  /** index of the one item highlighted inside the selected group, if any */
  readonly selectedItem: number | null
  readonly onSelect: (group: number | null, item: number | null) => void
  readonly unpacked?: string[]
}

// Side panel: details of the selected group, prev/next, and the list of every group in the box
function ItemPanel({ boxId, groups, selected, selectedItem, onSelect, unpacked }: ItemPanelProps) {
  const selectedGroup = selected !== null ? groups[selected] : undefined

  const stepSelection = (delta: number) => {
    const count = groups.length
    if (count === 0) return
    const current = selected ?? -1
    onSelect((current + delta + count) % count, null)
  }

  return (
    <aside className="detail-region">
      <h2>Items in {boxId}</h2>
      {selectedGroup && selected !== null ? (
        <div className="item-detail">
          <p className="item-detail__name">
            {selectedGroup.label}
            {selectedGroup.items.length > 1 && ` × ${selectedGroup.items.length}`}
          </p>
          <dl className="item-detail__specs">
            <dt>Colour:</dt>
            <dd className="item-detail__colour">
              <span className="item-swatch" style={{ background: itemColourCss(selectedGroup.colourIndex) }} aria-hidden="true" />
              {itemColourCss(selectedGroup.colourIndex)}
            </dd>
            <dt>Quantity:</dt>
            <dd>{selectedGroup.items.length}</dd>
            <dt>Size:</dt>
            <dd>
              {selectedGroup.dimensions.width} × {selectedGroup.dimensions.depth} × {selectedGroup.dimensions.length} mm
            </dd>
            <dt>{selectedGroup.items.length > 1 ? 'Positions:' : 'Position:'}</dt>
            <dd>
              {selectedGroup.items.map((item, i) => {
                const itemIndex = selectedGroup.itemIndices[i]!
                const isPicked = selectedItem === itemIndex
                // click one to highlight just that item, click again to go back to the whole group
                return (
                  <button
                    key={itemIndex}
                    type="button"
                    className={`item-unit${isPicked ? ' is-selected' : ''}`}
                    aria-pressed={isPicked}
                    onClick={() => onSelect(selected, isPicked ? null : itemIndex)}
                  >
                    <span className="item-unit__name">{item.itemId}</span>
                    <span className="item-unit__pos">
                      x {item.position.x} · y {item.position.y} · z {item.position.z} mm
                      {item.rotation ? ` · ${item.rotation}°` : ''}
                    </span>
                  </button>
                )
              })}
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
              onClick={() => onSelect(selected === g ? null : g, null)}
            >
              <span className="item-swatch" style={{ background: itemColourCss(group.colourIndex) }} aria-hidden="true" />
              <span className="item-name">
                {group.label}
                {group.items.length > 1 && <span className="item-qty"> × {group.items.length}</span>}
              </span>
              <span className="item-dims">
                {group.dimensions.width} × {group.dimensions.depth} × {group.dimensions.length} mm
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
