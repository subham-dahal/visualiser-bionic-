import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import type { PackingResult } from './types/packing'
import { usePackingResult } from './hooks/usePackingResult'
import { groupItems } from './utils/grouping'
import StatusScreen from './components/StatusScreen'
import BoxTabs from './components/BoxTabs'
import VisualiserCanvas from './components/VisualiserCanvas'
import ItemPanel from './components/ItemPanel'

export type { PackingResult, PackedBox, PackedItem } from './types/packing'

type AppProps = {
  /** A packing result already fetched by the host (e.g. FitPortal). Takes priority over orderId. */
  readonly result?: PackingResult
  /** If no result is given, fetch it ourselves from {apiBase}/api/orders/{orderId}/result. */
  readonly orderId?: string
  readonly apiBase?: string
}

function App({ result: resultProp, orderId, apiBase = '' }: AppProps) {
  const selectItemRef = useRef<(index: number | null) => void>(() => {})
  const [selected, setSelected] = useState<number | null>(null)
  const [boxIndex, setBoxIndex] = useState(0)
  const { result, loading, error } = usePackingResult(resultProp, orderId, apiBase)

  useEffect(() => {
    setBoxIndex(0)
    setSelected(null)
  }, [result])

  const box = result?.boxes?.[boxIndex]
  const groups = useMemo(() => groupItems(box?.items ?? []), [box])

  if (loading) return <StatusScreen message="Loading packing result…" />
  if (error) return <StatusScreen message={error} isError />
  if (result?.status !== 'success' || !result?.boxes?.length) {
    return <StatusScreen message={result?.message || 'No packing result to display yet.'} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Bionic Visualiser</h1>
        <p className="app-subtitle">
          Packing layout preview{result.source === 'mock' && ' · mock solver'}
        </p>
      </header>

      <BoxTabs boxes={result.boxes} activeIndex={boxIndex} onSelect={setBoxIndex} />

      {box && (
        <div className="app-body">
          <VisualiserCanvas box={box} groups={groups} selectItemRef={selectItemRef} onSelect={setSelected} />
          <ItemPanel
            boxId={box.boxId}
            groups={groups}
            selected={selected}
            onSelect={(index) => selectItemRef.current(index)}
            unpacked={result.unpacked}
          />
        </div>
      )}
    </div>
  )
}

export default App
