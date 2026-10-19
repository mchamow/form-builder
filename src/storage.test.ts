import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sampleForm, type Form } from './schema'
import { load, save, STORAGE_KEY } from './storage'

const makeId = () => 'gen'
const edited = (): Form => ({ ...sampleForm(), title: 'RSVP', fields: sampleForm().fields.slice(0, 2) })

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('round-trips the form', () => {
    save(edited())
    expect(load(makeId)).toEqual(edited())
  })

  it('falls back to the sample on missing or corrupt data', () => {
    expect(load(makeId)).toEqual(sampleForm())
    localStorage.setItem(STORAGE_KEY, '{nope')
    expect(load(makeId)).toEqual(sampleForm())
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: 'no fields' }))
    expect(load(makeId)).toEqual(sampleForm())
  })

  it('keeps an emptied form empty', () => {
    save({ title: 'Blank', description: '', fields: [] })
    expect(load(makeId).fields).toEqual([])
  })

  it('survives storage that throws', () => {
    const broken = {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('full')
      }),
    } as unknown as Storage
    expect(() => save(edited(), broken)).not.toThrow()
    expect(load(makeId, broken)).toEqual(sampleForm())
  })
})
