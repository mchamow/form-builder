import { describe, expect, it } from 'vitest'
import { createField, type Field, type FieldType } from './schema'
import { submission, validateField, validateForm } from './validate'

const field = (type: FieldType, patch: Partial<Field> = {}): Field => ({ ...createField(type, type), ...patch })

describe('validateField', () => {
  it('checks required answers, ignoring blank space', () => {
    expect(validateField(field('text', { required: true }), '  ')).toBe('This field is required')
    expect(validateField(field('text'), '')).toBeNull()
    expect(validateField(field('select', { required: true }), '')).toBe('Please choose an option')
    expect(validateField(field('radio', { required: true }), '')).toBe('Please choose an option')
  })

  it('wants a required checkbox ticked', () => {
    expect(validateField(field('checkbox', { required: true }), false)).toBe('Please tick this box')
    expect(validateField(field('checkbox', { required: true }), true)).toBeNull()
    expect(validateField(field('checkbox'), false)).toBeNull()
  })

  it('checks email addresses', () => {
    expect(validateField(field('email'), 'ada@example')).toBe('Enter a valid email address')
    expect(validateField(field('email'), 'ada@example.com')).toBeNull()
  })

  it('checks numbers against their range', () => {
    const guests = field('number', { min: '0', max: '3' })
    expect(validateField(guests, 'two')).toBe('Enter a number')
    expect(validateField(guests, '-1')).toBe('Must be at least 0')
    expect(validateField(guests, '4')).toBe('Must be at most 3')
    expect(validateField(guests, '2.5')).toBeNull()
    expect(validateField(field('number', { min: 'x' }), '-100')).toBeNull()
  })

  it('checks text length', () => {
    const name = field('text', { min: '2', max: '5' })
    expect(validateField(name, 'A')).toBe('Use at least 2 characters')
    expect(validateField(name, 'Abcdef')).toBe('Use at most 5 characters')
    expect(validateField(field('textarea', { min: '1' }), ' ')).toBeNull()
    expect(validateField(field('textarea', { min: '1', max: '1' }), 'ab')).toBe('Use at most 1 character')
  })

  it('only accepts listed options and real dates', () => {
    expect(validateField(field('select'), 'Option 2')).toBeNull()
    expect(validateField(field('radio'), 'Option 9')).toBe('Please choose an option')
    expect(validateField(field('date'), '2026-10-19')).toBeNull()
    expect(validateField(field('date'), '19/10/2026')).toBe('Enter a date')
  })
})

describe('validateForm', () => {
  it('collects errors by field id', () => {
    const fields = [field('text', { id: 'a', required: true }), field('email', { id: 'b' }), field('checkbox', { id: 'c', required: true })]
    expect(validateForm(fields, { b: 'nope' })).toEqual({
      a: 'This field is required',
      b: 'Enter a valid email address',
      c: 'Please tick this box',
    })
    expect(validateForm(fields, { a: 'Ada', c: true })).toEqual({})
  })
})

describe('submission', () => {
  it('keys answers by label, with numbers as numbers and blanks as null', () => {
    const fields = [
      field('text', { id: 'a', label: 'Full name' }),
      field('number', { id: 'b', label: 'Guests' }),
      field('textarea', { id: 'c', label: 'Notes' }),
      field('checkbox', { id: 'd', label: 'Agree' }),
    ]
    expect(submission(fields, { a: ' Ada ', b: '2', d: true })).toEqual({ fullName: 'Ada', guests: 2, notes: null, agree: true })
  })
})
