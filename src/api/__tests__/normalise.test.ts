import { describe, expect, it } from 'vitest'
import portalResult from '../../fixtures/portal-result.json'
import solverCamel from '../../fixtures/solver-camel.json'
import solverCamelNodims from '../../fixtures/solver-camel-nodims.json'
import solverSnake from '../../fixtures/solver-snake.json'
import { findOverlaps } from '../geometry'
import { NormaliseError, normalisePackingResult } from '../normalise'

describe('normalisePackingResult', () => {
  it('converts solver-camel.json to two boxes with distinct ids and the expected item counts', () => {
    const result = normalisePackingResult(solverCamel)
    expect(result.boxes).toHaveLength(2)

    const boxIds = result.boxes.map((box) => box.boxId)
    expect(new Set(boxIds).size).toBe(2)
    expect(result.boxes[0]?.items).toHaveLength(8)
    expect(result.boxes[1]?.items).toHaveLength(2)
  })

  it('findOverlaps is empty for both solver-camel.json boxes (axis mapping is identity)', () => {
    const result = normalisePackingResult(solverCamel)
    expect(findOverlaps(result.boxes[0]!.items)).toEqual([])
    expect(findOverlaps(result.boxes[1]!.items)).toEqual([])
  })

  it('converts solver-snake.json using legacy field names into sensible itemIds', () => {
    const result = normalisePackingResult(solverSnake)
    expect(result.boxes).toHaveLength(1)
    expect(result.boxes[0]?.items.map((item) => item.itemId)).toEqual(['ITEM-A', 'ITEM-B'])
  })

  it('derives box dimensions and a generated itemId from solver-camel-nodims.json', () => {
    const result = normalisePackingResult(solverCamelNodims)
    expect(result.boxes).toHaveLength(1)
    const box = result.boxes[0]!
    expect(box.dimensions.w).toBeGreaterThan(0)
    expect(box.dimensions.h).toBeGreaterThan(0)
    expect(box.dimensions.d).toBeGreaterThan(0)
    expect(box.dimensions).toEqual({ w: 100, h: 100, d: 100 })
    expect(box.items).toHaveLength(1)
    expect(box.items[0]?.itemId).toBe('item-0')
  })

  it('passes portal-result.json through with item counts and boxIds unchanged', () => {
    const result = normalisePackingResult(portalResult)
    expect(result.boxes.map((box) => box.boxId)).toEqual(['Crate-1', 'Crate-2'])
    expect(result.boxes[0]?.items).toHaveLength(8)
    expect(result.boxes[1]?.items).toHaveLength(2)
  })

  it('throws NormaliseError for an unrecognised object', () => {
    expect(() => normalisePackingResult({ foo: 'bar' })).toThrow(NormaliseError)
  })
})
