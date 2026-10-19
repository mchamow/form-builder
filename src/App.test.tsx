import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { sampleForm } from './schema'
import { STORAGE_KEY } from './storage'

const SAMPLE = ['Full name', 'Email', 'Ticket', 'Guests', 'Anything we should know?', 'I agree to the code of conduct']

const button = (name: string | RegExp) => screen.getByRole('button', { name })
const fieldList = () => screen.getByRole('list', { name: 'Fields' })
/** Field names in canvas order, read from each card's main button. */
const names = () =>
  within(fieldList())
    .getAllByRole('button', { pressed: undefined })
    .filter((b) => b.dataset.part === 'main')
    .map((b) => b.getAttribute('aria-label')!.replace(/ \(.*$/, ''))
const card = (name: string) => screen.getByRole('button', { name: new RegExp(`^${escape(name)} \\(`) })
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const settings = () => within(screen.getByRole('region', { name: 'Field settings' }))
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } })
const status = () => screen.getByRole('status').textContent
const choose = (combobox: HTMLElement, option: string) => {
  fireEvent.click(combobox)
  // Base UI only takes a mouse click on an item that the press started on.
  const item = screen.getByRole('option', { name: option })
  fireEvent.pointerDown(item, { pointerType: 'mouse' })
  fireEvent.click(item)
}
const mode = (name: 'Build' | 'Preview') => fireEvent.click(screen.getByRole('button', { name }))

/** jsdom has no layout: the form is 500×800 at the origin, each field a 80px-tall card every 100px. */
function fakeLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const box = (left: number, top: number, width: number, height: number) =>
      ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect
    if (this.hasAttribute('data-drop-zone')) return box(0, 0, 500, 800)
    if (this.hasAttribute('data-field-id')) {
      const i = [...document.querySelectorAll('[data-field-id]')].indexOf(this)
      return box(0, i * 100, 500, 80)
    }
    return box(600, 0, 180, 36)
  })
}
const pointer = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 }
function dragTo(from: HTMLElement, x: number, y: number) {
  const r = from.getBoundingClientRect()
  fireEvent.pointerDown(from, { ...pointer, clientX: r.left + 10, clientY: r.top + 10 })
  fireEvent.pointerMove(window, { ...pointer, clientX: x - 20, clientY: y - 20 })
  fireEvent.pointerMove(window, { ...pointer, clientX: x, clientY: y })
  fireEvent.pointerUp(window, { ...pointer, clientX: x, clientY: y })
}

let writeText: ReturnType<typeof vi.fn>

beforeEach(() => {
  localStorage.clear()
  // The drag loop schedules frames forever; tests don't need them.
  vi.stubGlobal('requestAnimationFrame', () => 0)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('building', () => {
  it('opens with the sample form', () => {
    render(<App />)
    expect(screen.getByRole('textbox', { name: 'Form title' })).toHaveProperty('value', 'Workshop sign-up')
    expect(names()).toEqual(SAMPLE)
    expect(screen.getByText('Select a field to change its label, rules and options.')).toBeTruthy()
  })

  it('adds a field from the palette at the end, or after the selected one', () => {
    render(<App />)
    fireEvent.click(button('Date'))
    expect(names().at(-1)).toBe('Date')
    expect(card('Date').getAttribute('aria-pressed')).toBe('true')
    expect(settings().getByRole('textbox', { name: 'Label' })).toHaveProperty('value', 'Date')
    expect(status()).toBe('Added Date field at position 7')

    fireEvent.click(card('Email'))
    fireEvent.click(button('Dropdown'))
    expect(names().slice(0, 4)).toEqual(['Full name', 'Email', 'Choose one', 'Ticket'])
  })

  it('drags a new field from the palette to a spot in the form', () => {
    fakeLayout()
    render(<App />)
    // Between the 1st card (middle at 40) and the 2nd (middle at 140)
    dragTo(button('Number'), 250, 90)
    expect(names().slice(0, 3)).toEqual(['Full name', 'Number', 'Email'])
    expect(status()).toBe('Added Number field at position 2')
  })

  it('drags a field to a new position and ignores drops outside the form', () => {
    fakeLayout()
    render(<App />)
    dragTo(card('Full name'), 250, 290) // between Ticket (middle at 240) and Guests (340)
    expect(names().slice(0, 4)).toEqual(['Email', 'Ticket', 'Full name', 'Guests'])
    dragTo(card('Email'), 1200, 100)
    expect(names()[0]).toBe('Email')
    // A press that doesn't travel is just a click: it selects.
    fireEvent.pointerDown(card('Guests'), { ...pointer, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(window, { ...pointer, clientX: 11, clientY: 11 })
    fireEvent.click(card('Guests'))
    expect(card('Guests').getAttribute('aria-pressed')).toBe('true')
  })

  it('cancels a drag with Escape', () => {
    fakeLayout()
    render(<App />)
    fireEvent.pointerDown(card('Email'), { ...pointer, clientX: 10, clientY: 110 })
    fireEvent.pointerMove(window, { ...pointer, clientX: 10, clientY: 500 })
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.pointerUp(window, { ...pointer, clientX: 10, clientY: 500 })
    expect(names()).toEqual(SAMPLE)
  })

  it('moves, steps through, duplicates and deletes fields from the keyboard', () => {
    render(<App />)
    card('Email').focus()
    fireEvent.keyDown(card('Email'), { key: 'ArrowDown', altKey: true })
    expect(names().slice(1, 3)).toEqual(['Ticket', 'Email'])
    expect(document.activeElement).toBe(card('Email'))
    expect(status()).toBe('Moved Email to position 3 of 6')

    fireEvent.keyDown(card('Email'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(card('Ticket'))

    fireEvent.keyDown(card('Ticket'), { key: 'd', ctrlKey: true })
    expect(names().slice(1, 3)).toEqual(['Ticket', 'Ticket'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Ticket (Multiple choice), 3 of 7' }))

    fireEvent.keyDown(document.activeElement!, { key: 'Delete' })
    expect(names()).toEqual(['Full name', 'Ticket', 'Email', 'Guests', 'Anything we should know?', 'I agree to the code of conduct'])
    expect(document.activeElement).toBe(card('Email'))
    expect(status()).toBe('Deleted Ticket')

    // The handle moves fields too.
    const handle = button('Reorder Guests')
    handle.focus()
    fireEvent.keyDown(handle, { key: 'ArrowUp', altKey: true })
    expect(names()[2]).toBe('Guests')
    expect(document.activeElement).toBe(button('Reorder Guests'))
  })

  it('duplicates and deletes with the card buttons', () => {
    render(<App />)
    fireEvent.click(button('Duplicate Guests'))
    expect(names().filter((n) => n === 'Guests')).toHaveLength(2)
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete Guests' })[0])
    fireEvent.click(button('Delete Guests'))
    expect(names()).not.toContain('Guests')
  })

  it('edits a field in the inspector', () => {
    render(<App />)
    fireEvent.click(card('Full name'))
    type(settings().getByRole('textbox', { name: 'Label' }), 'Your name')
    expect(names()[0]).toBe('Your name')
    expect(settings().getByText('yourName')).toBeTruthy()
    type(settings().getByRole('textbox', { name: 'Help text' }), 'As on your ID')
    expect(within(card('Your name')).getByText('As on your ID')).toBeTruthy()
    type(settings().getByRole('spinbutton', { name: 'Min length' }), '2')

    const required = settings().getByRole('switch', { name: 'Required' })
    expect(required.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(required)
    expect(required.getAttribute('aria-checked')).toBe('false')

    choose(settings().getByRole('combobox', { name: 'Type' }), 'Number')
    expect(card('Your name').getAttribute('aria-label')).toBe('Your name (Number), 1 of 6')
    expect(settings().getByRole('spinbutton', { name: 'Minimum' })).toHaveProperty('value', '2')
  })

  it('edits the options of a choice field', () => {
    render(<App />)
    fireEvent.click(card('Ticket'))
    const option = (n: number) => settings().getByRole('textbox', { name: `Option ${n}` }) as HTMLInputElement
    fireEvent.click(settings().getByRole('button', { name: 'Add option' }))
    type(option(4), 'Speaker')
    fireEvent.click(settings().getByRole('button', { name: 'Move option 4 up' }))
    fireEvent.click(settings().getByRole('button', { name: 'Remove option 1' }))
    expect([1, 2, 3].map((n) => option(n).value)).toEqual(['Student', 'Speaker', 'Supporter'])
    expect(within(card('Ticket')).getByText('Speaker')).toBeTruthy()
    fireEvent.keyDown(option(3), { key: 'Enter' })
    expect(option(4).value).toBe('Option 4')
  })

  it('edits the title and starts a blank form after confirming', () => {
    render(<App />)
    type(screen.getByRole('textbox', { name: 'Form title' }), 'RSVP')
    fireEvent.click(button('New form'))
    fireEvent.click(button('Cancel'))
    expect(names()).toHaveLength(6)
    fireEvent.click(button('New form'))
    fireEvent.click(button('Start blank'))
    expect(screen.queryByRole('list', { name: 'Fields' })).toBeNull()
    expect(screen.getByText('Drag a field here, or pick one from the list.')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Form title' })).toHaveProperty('value', 'Untitled form')
  })

  it('opens the settings under the selected field on narrow screens', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
    render(<App />)
    expect(screen.queryByText('Select a field to change its label, rules and options.')).toBeNull()
    fireEvent.click(card('Guests'))
    const item = card('Guests').closest('li')!
    expect(within(item).getByRole('region', { name: 'Field settings' })).toBeTruthy()
    expect(within(item).getByRole('spinbutton', { name: 'Maximum' })).toHaveProperty('value', '3')
  })
})

describe('preview', () => {
  it('validates on submit, focuses the first problem and re-checks as you fix it', () => {
    render(<App />)
    mode('Preview')
    const form = screen.getByRole('form', { name: 'Workshop sign-up' })
    fireEvent.click(within(form).getByRole('button', { name: 'Submit' }))
    const name = within(form).getByRole('textbox', { name: /Full name/ })
    expect(document.activeElement).toBe(name)
    expect(name.getAttribute('aria-invalid')).toBe('true')
    expect(within(form).getAllByText('This field is required')).toHaveLength(2)
    expect(within(form).getByText('Please choose an option')).toBeTruthy()
    expect(within(form).getByText('Please tick this box')).toBeTruthy()

    type(name, 'Ada')
    expect(within(form).getAllByText('This field is required')).toHaveLength(1)
    type(within(form).getByRole('textbox', { name: /Email/ }), 'ada@')
    expect(within(form).getByText('Enter a valid email address')).toBeTruthy()
    type(within(form).getByRole('spinbutton', { name: /Guests/ }), '9')
    expect(within(form).getByText('Must be at most 3')).toBeTruthy()
  })

  it('focuses a radio or checkbox when that is the first problem', () => {
    render(<App />)
    mode('Preview')
    const form = screen.getByRole('form', { name: 'Workshop sign-up' })
    type(within(form).getByRole('textbox', { name: /Full name/ }), 'Ada')
    type(within(form).getByRole('textbox', { name: /Email/ }), 'ada@example.com')
    fireEvent.click(within(form).getByRole('button', { name: 'Submit' }))
    expect(document.activeElement).toBe(within(form).getByRole('radio', { name: 'Standard' }))
    fireEvent.click(within(form).getByRole('radio', { name: 'Supporter' }))
    fireEvent.click(within(form).getByRole('button', { name: 'Submit' }))
    expect(document.activeElement).toBe(within(form).getByRole('checkbox', { name: /code of conduct/ }))
  })

  it('submits valid answers keyed by label', () => {
    render(<App />)
    mode('Preview')
    const form = screen.getByRole('form', { name: 'Workshop sign-up' })
    type(within(form).getByRole('textbox', { name: /Full name/ }), 'Ada Lovelace')
    type(within(form).getByRole('textbox', { name: /Email/ }), 'ada@example.com')
    fireEvent.click(within(form).getByRole('radio', { name: 'Student' }))
    type(within(form).getByRole('spinbutton', { name: /Guests/ }), '2')
    fireEvent.click(within(form).getByRole('checkbox', { name: /code of conduct/ }))
    fireEvent.click(within(form).getByRole('button', { name: 'Submit' }))
    expect(JSON.parse(screen.getByLabelText('Submitted data').textContent!)).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      ticket: 'Student',
      guests: 2,
      anythingWeShouldKnow: null,
      iAgreeToTheCodeOfConduct: true,
    })
    fireEvent.click(button('Fill in again'))
    expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveProperty('value', '')
  })

  it('uses dropdowns, and reflects builder edits', () => {
    render(<App />)
    fireEvent.click(button('Dropdown'))
    type(settings().getByRole('textbox', { name: 'Label' }), 'Shirt size')
    mode('Preview')
    const form = screen.getByRole('form', { name: 'Workshop sign-up' })
    choose(within(form).getByRole('combobox', { name: /Shirt size/ }), 'Option 2')
    expect(within(form).getByRole('combobox', { name: /Shirt size/ }).textContent).toContain('Option 2')
    mode('Build')
    expect(names().at(-1)).toBe('Shirt size')
  })
})

describe('import and export', () => {
  it('exports the form as JSON to copy or download', async () => {
    const createObjectURL = vi.fn(() => 'blob:form')
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() }))
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('workshop-sign-up.json')
    })
    render(<App />)
    fireEvent.click(button('Export'))
    const json = JSON.parse((screen.getByRole('textbox', { name: 'Form JSON' }) as HTMLTextAreaElement).value)
    expect(json.fields.map((f: { label: string }) => f.label)).toEqual(SAMPLE)
    await act(async () => fireEvent.click(button('Copy JSON')))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"title": "Workshop sign-up"'))
    expect(button('Copied')).toBeTruthy()
    fireEvent.click(button('Download'))
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clicked).toHaveBeenCalledOnce()
  })

  it('imports pasted JSON, explaining what is wrong with bad input', () => {
    render(<App />)
    fireEvent.click(button('Import'))
    const box = screen.getByRole('textbox', { name: 'Form JSON' })
    type(box, '{ nope')
    fireEvent.click(button('Import'))
    expect(screen.getByRole('alert').textContent).toBe("That isn't valid JSON.")
    type(box, '{"title": "x"}')
    fireEvent.click(button('Import'))
    expect(screen.getByRole('alert').textContent).toMatch(/needs a "fields" list/)
    type(box, JSON.stringify({ title: 'Feedback', fields: [{ type: 'textarea', label: 'Comments' }, { type: 'email', label: 'Email' }] }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Import' }).at(-1)!)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Form title' })).toHaveProperty('value', 'Feedback')
    expect(names()).toEqual(['Comments', 'Email'])
  })
})

describe('saving', () => {
  it('keeps the form across reloads', () => {
    render(<App />)
    fireEvent.click(button('Checkbox'))
    type(screen.getByRole('textbox', { name: 'Form title' }), 'Kept')
    cleanup()
    render(<App />)
    expect(screen.getByRole('textbox', { name: 'Form title' })).toHaveProperty('value', 'Kept')
    expect(names().at(-1)).toBe('I agree')
  })

  it('falls back to the sample when the saved form is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{"fields": 3}')
    render(<App />)
    expect(names()).toEqual(sampleForm().fields.map((f) => f.label))
  })
})
