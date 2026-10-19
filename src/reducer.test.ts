import { describe, expect, it } from 'vitest'
import { reducer, type State } from './reducer'
import { sampleForm } from './schema'

const start: State = { form: sampleForm(), selectedId: null }
const ids = (s: State) => s.form.fields.map((f) => f.id)
const field = (s: State, id: string) => s.form.fields.find((f) => f.id === id)!

describe('reducer', () => {
  it('edits the title and description', () => {
    const s = reducer(start, { type: 'setMeta', title: 'RSVP' })
    expect(s.form).toMatchObject({ title: 'RSVP', description: start.form.description })
  })

  it('adds a field at a position and selects it', () => {
    let s = reducer(start, { type: 'add', fieldType: 'date', id: 'd', index: 1 })
    expect(ids(s).slice(0, 3)).toEqual(['sample-name', 'd', 'sample-email'])
    expect(s.selectedId).toBe('d')
    s = reducer(s, { type: 'add', fieldType: 'select', id: 'e' })
    expect(ids(s).at(-1)).toBe('e')
    expect(field(s, 'e').options).toHaveLength(3)
    s = reducer(s, { type: 'add', fieldType: 'text', id: 'f', index: 99 })
    expect(ids(s).at(-1)).toBe('f')
  })

  it('updates a field', () => {
    const s = reducer(start, { type: 'update', id: 'sample-name', patch: { label: 'Name', required: false } })
    expect(field(s, 'sample-name')).toMatchObject({ label: 'Name', required: false, placeholder: 'Ada Lovelace' })
    expect(field(s, 'sample-email')).toBe(field(start, 'sample-email'))
  })

  it('changes type, giving new choice fields options and keeping existing ones', () => {
    let s = reducer(start, { type: 'changeType', id: 'sample-name', fieldType: 'select' })
    expect(field(s, 'sample-name')).toMatchObject({ type: 'select', options: ['Option 1', 'Option 2', 'Option 3'] })
    s = reducer(start, { type: 'changeType', id: 'sample-ticket', fieldType: 'select' })
    expect(field(s, 'sample-ticket').options).toEqual(['Standard', 'Student', 'Supporter'])
  })

  it('removes a field and hands the selection to its neighbour', () => {
    let s = reducer(start, { type: 'select', id: 'sample-email' })
    s = reducer(s, { type: 'remove', id: 'sample-email' })
    expect(ids(s)).not.toContain('sample-email')
    expect(s.selectedId).toBe('sample-ticket')
    s = reducer(s, { type: 'select', id: 'sample-coc' })
    s = reducer(s, { type: 'remove', id: 'sample-coc' })
    expect(s.selectedId).toBe('sample-notes')
    s = reducer(s, { type: 'remove', id: 'sample-name' })
    expect(s.selectedId).toBe('sample-notes')
  })

  it('duplicates a field right after itself', () => {
    const s = reducer(start, { type: 'duplicate', id: 'sample-ticket', newId: 'copy' })
    expect(ids(s).slice(2, 4)).toEqual(['sample-ticket', 'copy'])
    expect(field(s, 'copy')).toMatchObject({ ...field(start, 'sample-ticket'), id: 'copy' })
    expect(field(s, 'copy').options).not.toBe(field(s, 'sample-ticket').options)
    expect(s.selectedId).toBe('copy')
  })

  it('moves a field to an index in the list without it', () => {
    let s = reducer(start, { type: 'move', id: 'sample-name', index: 2 })
    expect(ids(s).slice(0, 3)).toEqual(['sample-email', 'sample-ticket', 'sample-name'])
    s = reducer(s, { type: 'move', id: 'sample-coc', index: 0 })
    expect(ids(s)[0]).toBe('sample-coc')
    expect(reducer(s, { type: 'move', id: 'sample-coc', index: -5 })).toBe(s)
    expect(ids(reducer(s, { type: 'move', id: 'sample-coc', index: 99 })).at(-1)).toBe('sample-coc')
  })

  it('adds, renames, reorders and removes options, keeping at least one', () => {
    let s = reducer(start, { type: 'addOption', id: 'sample-ticket' })
    expect(field(s, 'sample-ticket').options).toEqual(['Standard', 'Student', 'Supporter', 'Option 4'])
    s = reducer(s, { type: 'setOption', id: 'sample-ticket', index: 3, value: 'Speaker' })
    s = reducer(s, { type: 'moveOption', id: 'sample-ticket', index: 3, by: -1 })
    expect(field(s, 'sample-ticket').options).toEqual(['Standard', 'Student', 'Speaker', 'Supporter'])
    expect(reducer(s, { type: 'moveOption', id: 'sample-ticket', index: 0, by: -1 })).toEqual(s)
    for (let i = 0; i < 5; i++) s = reducer(s, { type: 'removeOption', id: 'sample-ticket', index: 0 })
    expect(field(s, 'sample-ticket').options).toEqual(['Supporter'])
  })

  it('names new options after ones already taken', () => {
    let s = reducer(start, { type: 'add', fieldType: 'radio', id: 'r' })
    s = reducer(s, { type: 'removeOption', id: 'r', index: 0 })
    s = reducer(s, { type: 'addOption', id: 'r' })
    expect(field(s, 'r').options).toEqual(['Option 2', 'Option 3', 'Option 4'])
  })

  it('replaces the form and clears the selection', () => {
    const s = reducer({ ...start, selectedId: 'sample-name' }, { type: 'replace', form: { title: 'New', description: '', fields: [] } })
    expect(s).toEqual({ form: { title: 'New', description: '', fields: [] }, selectedId: null })
  })
})
