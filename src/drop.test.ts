import { describe, expect, it } from 'vitest'
import { dropIndex, isNear } from './drop'

describe('dropIndex', () => {
  it('lands in front of the first item whose middle is below the pointer', () => {
    const mids = [50, 150, 250]
    expect(dropIndex(mids, 10)).toBe(0)
    expect(dropIndex(mids, 60)).toBe(1)
    expect(dropIndex(mids, 249)).toBe(2)
    expect(dropIndex(mids, 900)).toBe(3)
    expect(dropIndex([], 100)).toBe(0)
  })
})

describe('isNear', () => {
  it('counts points just outside the rectangle', () => {
    const rect = { left: 100, top: 100, right: 300, bottom: 400 }
    expect(isNear(rect, 200, 200, 0)).toBe(true)
    expect(isNear(rect, 90, 200, 0)).toBe(false)
    expect(isNear(rect, 90, 200, 24)).toBe(true)
    expect(isNear(rect, 200, 430, 24)).toBe(false)
  })
})
