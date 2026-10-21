// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import portalResult from '../fixtures/portal-result.json'
import portalLive from '../fixtures/portal-live.json'
import type { PackingResult } from '../types/packing'

// jsdom has no WebGL, so stand in for the three.js canvas
// (it also owns selection, so wire selectItemRef straight through like the real one does)
vi.mock('../components/VisualiserCanvas', () => ({
  default: ({
    box,
    selectItemRef,
    onSelect,
  }: {
    box: { boxId: string }
    selectItemRef: { current: (index: number | null) => void }
    onSelect: (index: number | null) => void
  }) => {
    selectItemRef.current = onSelect
    return <div data-testid="canvas">{box.boxId}</div>
  },
}))

afterEach(cleanup)

const PORTAL = portalResult as PackingResult
const OTHER: PackingResult = {
  status: 'success',
  source: 'bionic-solver',
  boxes: [
    { boxId: 'Satchel-A', dimensions: { width: 400, depth: 100, length: 300 }, items: [] },
    { boxId: 'Satchel-B', dimensions: { width: 400, depth: 100, length: 300 }, items: [] },
  ],
}

describe('App', () => {
  it('renders the first box of a host-provided result', () => {
    render(<App result={PORTAL} />)
    expect(screen.getByTestId('canvas').textContent).toBe('Crate-1')
  })

  it('goes back to the first box and clears selection when the result changes', () => {
    const { rerender } = render(<App result={PORTAL} />)
    fireEvent.click(screen.getByRole('button', { name: /Crate-2/ }))
    expect(screen.getByTestId('canvas').textContent).toBe('Crate-2')
    fireEvent.click(screen.getByRole('button', { name: /MONITOR/ }))
    expect(screen.getByText('1 / 2')).toBeTruthy()

    rerender(<App result={OTHER} />)
    expect(screen.getByTestId('canvas').textContent).toBe('Satchel-A')
    expect(screen.queryByText('1 / 2')).toBeNull()
  })

  it("renders FitPortal's exact result payload ({ w, h, d } dimensions)", () => {
    render(<App result={portalLive as unknown as PackingResult} />)
    expect(screen.getByTestId('canvas').textContent).toBe('Carton-L')
    expect(screen.getByRole('button', { name: /MONITOR/ })).toBeTruthy()
  })

  it('shows the solver message when the result is an error', () => {
    render(<App result={{ status: 'error', source: 'bionic-solver', message: 'No box fits SKU-9', boxes: [] }} />)
    expect(screen.getByText('No box fits SKU-9')).toBeTruthy()
  })
})
