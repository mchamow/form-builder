export const FIELD_TYPES = [
  { type: 'text', label: 'Short text' },
  { type: 'textarea', label: 'Long text' },
  { type: 'email', label: 'Email' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'select', label: 'Dropdown' },
  { type: 'radio', label: 'Multiple choice' },
  { type: 'checkbox', label: 'Checkbox' },
] as const

export type FieldType = (typeof FIELD_TYPES)[number]['type']

export interface Field {
  id: string
  type: FieldType
  label: string
  help: string
  placeholder: string
  required: boolean
  /** Choices for dropdowns and multiple choice. */
  options: string[]
  /** Number fields: the allowed range. Text fields: the allowed length. Blank means no limit. */
  min: string
  max: string
}

export interface Form {
  title: string
  description: string
  fields: Field[]
}

export const isFieldType = (v: unknown): v is FieldType => FIELD_TYPES.some((t) => t.type === v)
export const fieldName = (field: Field) => field.label.trim() || 'Untitled'
export const typeLabel = (type: FieldType) => FIELD_TYPES.find((t) => t.type === type)!.label
export const hasOptions = (type: FieldType) => type === 'select' || type === 'radio'
export const hasPlaceholder = (type: FieldType) => ['text', 'textarea', 'email', 'number'].includes(type)
export const hasLength = (type: FieldType) => type === 'text' || type === 'textarea'
export const hasRange = (type: FieldType) => type === 'number'

const DEFAULT_LABELS: Record<FieldType, string> = {
  text: 'Short answer',
  textarea: 'Long answer',
  email: 'Email',
  number: 'Number',
  date: 'Date',
  select: 'Choose one',
  radio: 'Pick an option',
  checkbox: 'I agree',
}

export function createField(type: FieldType, id: string): Field {
  return {
    id,
    type,
    label: DEFAULT_LABELS[type],
    help: '',
    placeholder: '',
    required: false,
    options: hasOptions(type) ? ['Option 1', 'Option 2', 'Option 3'] : [],
    min: '',
    max: '',
  }
}

export const emptyForm = (): Form => ({ title: 'Untitled form', description: '', fields: [] })

/** What a first visit shows: a small sign-up form using most field types. */
export function sampleForm(): Form {
  const field = (id: string, type: FieldType, patch: Partial<Field>): Field => ({ ...createField(type, id), ...patch })
  return {
    title: 'Workshop sign-up',
    description: 'Save your seat for the Saturday React workshop.',
    fields: [
      field('sample-name', 'text', { label: 'Full name', placeholder: 'Ada Lovelace', required: true, max: '80' }),
      field('sample-email', 'email', { label: 'Email', placeholder: 'you@example.com', required: true, help: "We'll send the joining details here." }),
      field('sample-ticket', 'radio', { label: 'Ticket', options: ['Standard', 'Student', 'Supporter'], required: true }),
      field('sample-guests', 'number', { label: 'Guests', help: 'How many people are you bringing?', min: '0', max: '3', placeholder: '0' }),
      field('sample-notes', 'textarea', { label: 'Anything we should know?', placeholder: 'Dietary needs, accessibility…', max: '500' }),
      field('sample-coc', 'checkbox', { label: 'I agree to the code of conduct', required: true }),
    ],
  }
}

/**
 * The key each field's answer is stored under: the label in camelCase ("Full name" → fullName),
 * numbered when two labels would clash. Keys follow the field order, so they're stable while editing.
 */
export function fieldKeys(fields: Field[]): string[] {
  const used = new Map<string, number>()
  return fields.map((field) => {
    const words = field.label
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
    const base =
      words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('') || 'field'
    const key = /^\d/.test(base) ? `field${base}` : base
    const n = (used.get(key) ?? 0) + 1
    used.set(key, n)
    return n === 1 ? key : `${key}${n}`
  })
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const text = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const limit = (v: unknown): string => (typeof v === 'number' && Number.isFinite(v) ? String(v) : typeof v === 'string' && (v === '' || Number.isFinite(Number(v))) ? v.trim() : '')

/**
 * Reads a form from untrusted JSON (a saved draft or an import). Fields without a known type are
 * dropped; missing ids are made up and repeats replaced. Returns null if it isn't a form at all.
 */
export function parseForm(raw: unknown, makeId: () => string): Form | null {
  if (!isRecord(raw) || !Array.isArray(raw.fields)) return null
  const seen = new Set<string>()
  const fields = raw.fields.flatMap((f): Field[] => {
    if (!isRecord(f) || !isFieldType(f.type)) return []
    let id = typeof f.id === 'string' && f.id && !seen.has(f.id) ? f.id : makeId()
    while (seen.has(id)) id = makeId()
    seen.add(id)
    const options = Array.isArray(f.options) ? f.options.filter((o): o is string => typeof o === 'string') : []
    return [
      {
        id,
        type: f.type,
        label: text(f.label),
        help: text(f.help),
        placeholder: text(f.placeholder),
        required: f.required === true,
        options: hasOptions(f.type) && options.length === 0 ? createField(f.type, id).options : options,
        min: limit(f.min),
        max: limit(f.max),
      },
    ]
  })
  return { title: text(raw.title, 'Untitled form'), description: text(raw.description), fields }
}

/** The JSON a form exports to: everything but the internal ids. */
export function exportForm(form: Form): string {
  return JSON.stringify(
    {
      title: form.title,
      description: form.description,
      fields: form.fields.map(({ id: _id, ...field }) => field),
    },
    null,
    2,
  )
}

/** A file name from the form title: "Workshop sign-up" → workshop-sign-up.json */
export const fileName = (title: string) =>
  `${
    title
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'form'
  }.json`

/** Reads pasted JSON as a form, or says what's wrong with it. */
export function readImport(text: string, makeId: () => string = () => crypto.randomUUID()): { form: Form } | { error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { error: "That isn't valid JSON." }
  }
  const form = parseForm(raw, makeId)
  return form ? { form } : { error: 'That JSON isn\'t a form: it needs a "fields" list.' }
}
