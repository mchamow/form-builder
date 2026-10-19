import { parseForm, sampleForm, type Form } from './schema'

export const STORAGE_KEY = 'form-builder'

export function save(form: Form, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(form))
  } catch {
    // Storage full or blocked: the builder still works, the form just won't be remembered.
  }
}

/** Restores the saved form; a first visit, or a draft that isn't a form any more, gets the sample. */
export function load(makeId: () => string, storage: Storage = localStorage): Form {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return (raw !== null && parseForm(JSON.parse(raw), makeId)) || sampleForm()
  } catch {
    return sampleForm()
  }
}
