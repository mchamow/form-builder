import { fieldKeys, type Field } from './schema'

/** Answers as the form holds them: text for most fields, a boolean for checkboxes. */
export type Value = string | boolean

export const emptyValue = (field: Field): Value => (field.type === 'checkbox' ? false : '')

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A limit set in the builder, or null when it's blank or not a number. */
const bound = (v: string): number | null => (v.trim() === '' || !Number.isFinite(Number(v)) ? null : Number(v))

const characters = (n: number) => `${n} character${n === 1 ? '' : 's'}`

/** The first thing wrong with an answer, or null if it's fine. */
export function validateField(field: Field, value: Value): string | null {
  if (field.type === 'checkbox') return field.required && value !== true ? 'Please tick this box' : null
  const answer = typeof value === 'string' ? value.trim() : ''
  if (!answer) {
    if (!field.required) return null
    return field.type === 'select' || field.type === 'radio' ? 'Please choose an option' : 'This field is required'
  }
  const min = bound(field.min)
  const max = bound(field.max)
  switch (field.type) {
    case 'email':
      return EMAIL.test(answer) ? null : 'Enter a valid email address'
    case 'number': {
      const n = Number(answer)
      if (!Number.isFinite(n)) return 'Enter a number'
      if (min !== null && n < min) return `Must be at least ${min}`
      if (max !== null && n > max) return `Must be at most ${max}`
      return null
    }
    case 'select':
    case 'radio':
      return field.options.includes(answer) ? null : 'Please choose an option'
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(answer) ? null : 'Enter a date'
    default: // short and long text: a length limit
      if (min !== null && answer.length < min) return `Use at least ${characters(min)}`
      if (max !== null && answer.length > max) return `Use at most ${characters(max)}`
      return null
  }
}

/** Errors by field id; empty when the whole form is valid. */
export function validateForm(fields: Field[], values: Record<string, Value>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of fields) {
    const error = validateField(field, values[field.id] ?? emptyValue(field))
    if (error) errors[field.id] = error
  }
  return errors
}

/** The submitted answers keyed by each field's key, with numbers as numbers and blanks as null. */
export function submission(fields: Field[], values: Record<string, Value>): Record<string, unknown> {
  const keys = fieldKeys(fields)
  return Object.fromEntries(
    fields.map((field, i) => {
      const value = values[field.id] ?? emptyValue(field)
      if (typeof value === 'boolean') return [keys[i], value]
      const answer = value.trim()
      if (!answer) return [keys[i], null]
      return [keys[i], field.type === 'number' ? Number(answer) : answer]
    }),
  )
}
