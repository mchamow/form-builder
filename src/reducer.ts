import { createField, hasOptions, type Field, type FieldType, type Form } from './schema'

export interface State {
  form: Form
  selectedId: string | null
}

type FieldPatch = Partial<Omit<Field, 'id' | 'type' | 'options'>>

export type Action =
  | { type: 'setMeta'; title?: string; description?: string }
  | { type: 'add'; fieldType: FieldType; id: string; index?: number }
  | { type: 'update'; id: string; patch: FieldPatch }
  | { type: 'changeType'; id: string; fieldType: FieldType }
  | { type: 'remove'; id: string }
  | { type: 'duplicate'; id: string; newId: string }
  /** `index` is the field's new position once it has been taken out of the list. */
  | { type: 'move'; id: string; index: number }
  | { type: 'select'; id: string | null }
  | { type: 'addOption'; id: string }
  | { type: 'setOption'; id: string; index: number; value: string }
  | { type: 'removeOption'; id: string; index: number }
  | { type: 'moveOption'; id: string; index: number; by: -1 | 1 }
  | { type: 'replace'; form: Form }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function mapField(state: State, id: string, fn: (field: Field) => Field): State {
  return { ...state, form: { ...state.form, fields: state.form.fields.map((f) => (f.id === id ? fn(f) : f)) } }
}

const setFields = (state: State, fields: Field[], selectedId = state.selectedId): State => ({
  form: { ...state.form, fields },
  selectedId,
})

/** The first "Option N" not already taken. */
function nextOptionName(options: string[]): string {
  let n = options.length + 1
  while (options.includes(`Option ${n}`)) n++
  return `Option ${n}`
}

export function reducer(state: State, action: Action): State {
  const { fields } = state.form
  switch (action.type) {
    case 'setMeta':
      return {
        ...state,
        form: {
          ...state.form,
          title: action.title ?? state.form.title,
          description: action.description ?? state.form.description,
        },
      }
    case 'add': {
      const index = clamp(action.index ?? fields.length, 0, fields.length)
      const next = [...fields]
      next.splice(index, 0, createField(action.fieldType, action.id))
      return setFields(state, next, action.id)
    }
    case 'update':
      return mapField(state, action.id, (f) => ({ ...f, ...action.patch }))
    case 'changeType':
      return mapField(state, action.id, (f) => ({
        ...f,
        type: action.fieldType,
        options: hasOptions(action.fieldType) && f.options.length === 0 ? createField(action.fieldType, f.id).options : f.options,
      }))
    case 'remove': {
      const index = fields.findIndex((f) => f.id === action.id)
      if (index === -1) return state
      const next = fields.filter((f) => f.id !== action.id)
      // Selection moves to the field that takes its place, so Delete can be pressed again.
      const selectedId = state.selectedId === action.id ? (next[index] ?? next[index - 1])?.id ?? null : state.selectedId
      return setFields(state, next, selectedId)
    }
    case 'duplicate': {
      const index = fields.findIndex((f) => f.id === action.id)
      if (index === -1) return state
      const copy = { ...fields[index], id: action.newId, options: [...fields[index].options] }
      const next = [...fields]
      next.splice(index + 1, 0, copy)
      return setFields(state, next, action.newId)
    }
    case 'move': {
      const from = fields.findIndex((f) => f.id === action.id)
      if (from === -1) return state
      const rest = fields.filter((f) => f.id !== action.id)
      const to = clamp(action.index, 0, rest.length)
      if (to === from) return state
      rest.splice(to, 0, fields[from])
      return setFields(state, rest)
    }
    case 'select':
      return state.selectedId === action.id ? state : { ...state, selectedId: action.id }
    case 'addOption':
      return mapField(state, action.id, (f) => ({ ...f, options: [...f.options, nextOptionName(f.options)] }))
    case 'setOption':
      return mapField(state, action.id, (f) => ({
        ...f,
        options: f.options.map((o, i) => (i === action.index ? action.value : o)),
      }))
    case 'removeOption':
      return mapField(state, action.id, (f) =>
        f.options.length <= 1 ? f : { ...f, options: f.options.filter((_, i) => i !== action.index) },
      )
    case 'moveOption':
      return mapField(state, action.id, (f) => {
        const to = action.index + action.by
        if (to < 0 || to >= f.options.length) return f
        const options = [...f.options]
        ;[options[action.index], options[to]] = [options[to], options[action.index]]
        return { ...f, options }
      })
    case 'replace':
      return { form: action.form, selectedId: null }
  }
}
