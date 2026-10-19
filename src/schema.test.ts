import { describe, expect, it } from 'vitest'
import { createField, exportForm, fieldKeys, parseForm, sampleForm, type Field } from './schema'

const ids = () => {
  let n = 0
  return () => `gen-${++n}`
}
const labelled = (...labels: string[]): Field[] => labels.map((label, i) => ({ ...createField('text', `f${i}`), label }))

describe('createField', () => {
  it('gives choice fields three options and others none', () => {
    expect(createField('radio', 'a').options).toEqual(['Option 1', 'Option 2', 'Option 3'])
    expect(createField('email', 'a')).toMatchObject({ id: 'a', type: 'email', label: 'Email', options: [], required: false })
  })
})

describe('fieldKeys', () => {
  it('camel-cases labels and numbers repeats', () => {
    expect(fieldKeys(labelled('Full name', 'E-mail address', 'Full name', 'Full  NAME'))).toEqual([
      'fullName',
      'eMailAddress',
      'fullName2',
      'fullName3',
    ])
  })

  it('handles accents, digits and blank labels', () => {
    expect(fieldKeys(labelled('Prénom', '2nd choice', '', '?!'))).toEqual(['prenom', 'field2ndChoice', 'field', 'field2'])
  })
})

describe('parseForm', () => {
  it('reads back an export', () => {
    const form = sampleForm()
    const back = parseForm(JSON.parse(exportForm(form)), ids())!
    expect(back.title).toBe(form.title)
    expect(back.fields.map(({ id: _id, ...f }) => f)).toEqual(form.fields.map(({ id: _id, ...f }) => f))
    expect(back.fields.map((f) => f.id)).toEqual(['gen-1', 'gen-2', 'gen-3', 'gen-4', 'gen-5', 'gen-6'])
  })

  it('rejects things that are not forms', () => {
    expect(parseForm(null, ids())).toBeNull()
    expect(parseForm([1, 2], ids())).toBeNull()
    expect(parseForm({ title: 'x' }, ids())).toBeNull()
  })

  it('cleans up fields one by one', () => {
    const form = parseForm(
      {
        title: 7,
        fields: [
          { id: 'a', type: 'text', label: 'Name', required: 'yes', min: 2, max: 'lots' },
          { id: 'a', type: 'select', label: 'Dup id, no options', options: [1, null] },
          { type: 'video', label: 'Unknown type' },
          'nope',
          { type: 'checkbox', label: 42 },
        ],
      },
      ids(),
    )!
    expect(form.title).toBe('Untitled form')
    expect(form.description).toBe('')
    expect(form.fields).toHaveLength(3)
    expect(form.fields[0]).toMatchObject({ id: 'a', label: 'Name', required: false, min: '2', max: '' })
    expect(form.fields[1]).toMatchObject({ id: 'gen-1', options: ['Option 1', 'Option 2', 'Option 3'] })
    expect(form.fields[2]).toMatchObject({ id: 'gen-2', type: 'checkbox', label: '' })
  })
})

describe('exportForm', () => {
  it('leaves out internal ids', () => {
    const json = JSON.parse(exportForm(sampleForm()))
    expect(Object.keys(json)).toEqual(['title', 'description', 'fields'])
    expect(json.fields[0]).not.toHaveProperty('id')
    expect(json.fields[0]).toMatchObject({ type: 'text', label: 'Full name', required: true, max: '80' })
  })
})
