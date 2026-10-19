import { Calendar, ChevronDown, Copy, FilePlus2, GripVertical, MousePointerClick, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { FIELD_ICONS } from './icons'
import type { Action, State } from './reducer'
import { emptyForm, FIELD_TYPES, fieldName, typeLabel, type Field, type FieldType } from './schema'
import type { Drag, DragSource } from './useFieldDrag'

type Dispatch = (action: Action) => void
type Begin = (event: PointerEvent<HTMLElement>, source: DragSource, label: string) => void

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'

export function Palette({ onAdd, begin }: { onAdd: (type: FieldType) => void; begin: Begin }) {
  return (
    <section aria-labelledby="palette-title" className="lg:sticky lg:top-20">
      <h2 id="palette-title" className="mb-2 text-sm font-medium text-muted-foreground">
        Add a field
      </h2>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
        {FIELD_TYPES.map(({ type, label }) => {
          const Icon = FIELD_ICONS[type]
          return (
            <li key={type}>
              <Button
                variant="outline"
                className="w-full cursor-grab justify-start bg-card active:cursor-grabbing"
                title="Click to add, or drag into the form"
                onClick={() => onAdd(type)}
                onPointerDown={(e) => begin(e, { kind: 'new', fieldType: type }, label)}
              >
                <Icon data-icon="inline-start" className="text-muted-foreground" />
                {label}
              </Button>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 hidden text-xs leading-relaxed text-muted-foreground lg:block">
        Click a field to add it below the selected one, or drag it to any spot in the form.
      </p>
    </section>
  )
}

/** A picture of the control, so the canvas reads like the form without being one. */
function FieldMock({ field }: { field: Field }) {
  const box = 'flex h-8 items-center justify-between rounded-md border border-input bg-background/60 px-2.5 text-sm text-muted-foreground dark:bg-input/20'
  switch (field.type) {
    case 'textarea':
      return <div className={cn(box, 'h-14 items-start pt-1.5')}>{field.placeholder}</div>
    case 'date':
      return (
        <div className={box}>
          dd / mm / yyyy <Calendar className="size-3.5" />
        </div>
      )
    case 'select':
      return (
        <div className={box}>
          {field.options[0] ? 'Choose…' : 'No options'} <ChevronDown className="size-3.5" />
        </div>
      )
    case 'radio':
      return (
        <ul className="grid gap-1 text-sm">
          {field.options.map((option, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="size-3.5 shrink-0 rounded-full border border-input" />
              <span className="truncate">{option || <em className="text-muted-foreground">Blank option</em>}</span>
            </li>
          ))}
        </ul>
      )
    case 'checkbox':
      return null
    default:
      return <div className={box}>{field.placeholder}</div>
  }
}

function FieldCard({
  field,
  position,
  count,
  selected,
  dragging,
  dropMark,
  begin,
  onSelect,
  onDuplicate,
  onRemove,
  onKeyDown,
  children,
}: {
  field: Field
  position: number
  count: number
  selected: boolean
  dragging: boolean
  dropMark: 'before' | 'after' | null
  begin: Begin
  onSelect: () => void
  onDuplicate: () => void
  onRemove: () => void
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void
  children?: ReactNode
}) {
  const name = fieldName(field)
  const Icon = FIELD_ICONS[field.type]
  return (
    <li
      data-field-id={field.id}
      onPointerDown={(e) => begin(e, { kind: 'move', id: field.id }, name)}
      className={cn(
        'relative rounded-xl border bg-card shadow-xs transition-[opacity,box-shadow,border-color]',
        selected ? 'border-primary/70 ring-3 ring-primary/15' : 'hover:border-foreground/20',
        dragging && 'opacity-40',
        dropMark &&
          'before:absolute before:inset-x-2 before:h-1 before:rounded-full before:bg-primary before:content-[""]',
        dropMark === 'before' && 'before:-top-[0.4375rem]',
        dropMark === 'after' && 'before:-bottom-[0.4375rem]',
      )}
    >
      <div className="flex items-stretch" onKeyDown={onKeyDown}>
        <button
          type="button"
          data-drag-handle
          data-part="handle"
          aria-label={`Reorder ${name}`}
          aria-describedby="reorder-help"
          title="Drag, or Alt + arrow keys"
          onClick={onSelect}
          className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
        <button
          type="button"
          data-part="main"
          aria-pressed={selected}
          aria-label={`${name} (${typeLabel(field.type)}), ${position} of ${count}`}
          onClick={onSelect}
          className="grid min-w-0 flex-1 gap-1.5 rounded-lg py-3 pr-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="flex min-w-0 items-center gap-2">
            {field.type === 'checkbox' && <span className="size-4 shrink-0 rounded-[4px] border border-input" />}
            <span className="truncate text-sm font-medium">{name}</span>
            {field.required && (
              <span className="-ml-1 text-destructive" title="Required">
                *
              </span>
            )}
            <Badge variant="secondary" className="ml-auto shrink-0 gap-1 font-normal text-muted-foreground">
              <Icon />
              <span className="hidden sm:inline">{typeLabel(field.type)}</span>
            </Badge>
          </span>
          {field.help && <span className="text-xs text-muted-foreground">{field.help}</span>}
          <span aria-hidden className="pointer-events-none">
            <FieldMock field={field} />
          </span>
        </button>
        <div data-no-drag className="flex shrink-0 flex-col justify-center gap-0.5 p-1.5">
          <Button variant="ghost" size="icon-sm" aria-label={`Duplicate ${name}`} title={`Duplicate (${MOD}D)`} onClick={onDuplicate}>
            <Copy />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${name}`}
            title="Delete (Del)"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {children && (
        <div data-no-drag className="border-t px-3 pt-3 pb-4">
          {children}
        </div>
      )}
    </li>
  )
}

export function Canvas({
  state,
  dispatch,
  drag,
  begin,
  announce,
  inlineInspector,
}: {
  state: State
  dispatch: Dispatch
  drag: Drag | null
  begin: Begin
  announce: (message: string) => void
  /** On narrow screens the selected field's settings open right under it. */
  inlineInspector: ReactNode
}) {
  const { form, selectedId } = state
  const { fields } = form
  const [confirmNew, setConfirmNew] = useState(false)
  // Focus to restore once React has re-rendered (moving a focused element loses its focus).
  const focusNext = useRef<{ id: string; part: 'main' | 'handle' } | null>(null)

  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    document.querySelector<HTMLElement>(`[data-field-id="${target.id}"] [data-part="${target.part}"]`)?.focus()
  })

  useEffect(() => {
    if (!selectedId) return
    document.querySelector(`[data-field-id="${selectedId}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [selectedId])

  const draggedId = drag?.source.kind === 'move' ? drag.source.id : null
  const rest = fields.filter((f) => f.id !== draggedId)
  const dropMark = (field: Field): 'before' | 'after' | null => {
    if (!drag || drag.index === null || field.id === draggedId) return null
    const i = rest.indexOf(field)
    if (i === drag.index) return 'before'
    if (i === rest.length - 1 && drag.index === rest.length) return 'after'
    return null
  }

  const move = (field: Field, by: -1 | 1, part: 'main' | 'handle') => {
    const index = fields.indexOf(field) + by
    if (index < 0 || index >= fields.length) return
    dispatch({ type: 'move', id: field.id, index })
    focusNext.current = { id: field.id, part }
    announce(`Moved ${fieldName(field)} to position ${index + 1} of ${fields.length}`)
  }

  const remove = (field: Field) => {
    const index = fields.indexOf(field)
    const next = fields[index + 1] ?? fields[index - 1]
    dispatch({ type: 'remove', id: field.id })
    if (next) focusNext.current = { id: next.id, part: 'main' }
    announce(`Deleted ${fieldName(field)}`)
  }

  const duplicate = (field: Field) => {
    const newId = crypto.randomUUID()
    dispatch({ type: 'duplicate', id: field.id, newId })
    focusNext.current = { id: newId, part: 'main' }
    announce(`Duplicated ${fieldName(field)}`)
  }

  const onKeyDown = (field: Field) => (event: KeyboardEvent<HTMLElement>) => {
    const part = (event.target as HTMLElement).dataset.part
    if (part !== 'main' && part !== 'handle') return
    const mod = event.metaKey || event.ctrlKey
    if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !mod) {
      event.preventDefault()
      const by = event.key === 'ArrowUp' ? -1 : 1
      if (event.altKey) return move(field, by, part)
      const neighbour = fields[fields.indexOf(field) + by]
      if (neighbour) document.querySelector<HTMLElement>(`[data-field-id="${neighbour.id}"] [data-part="${part}"]`)?.focus()
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && !mod && !event.altKey) {
      event.preventDefault()
      remove(field)
    } else if (event.key.toLowerCase() === 'd' && mod && !event.altKey && !event.shiftKey) {
      event.preventDefault()
      duplicate(field)
    }
  }

  const emptyTarget = drag !== null && drag.index !== null && rest.length === 0

  return (
    <section aria-label="Form" className="min-w-0">
      <div className="mb-4 flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-1">
          <Input
            aria-label="Form title"
            value={form.title}
            onChange={(e) => dispatch({ type: 'setMeta', title: e.target.value })}
            placeholder="Form title"
            className="h-auto border-transparent bg-transparent px-2 py-1 text-xl font-semibold tracking-tight shadow-none hover:border-input md:text-xl dark:bg-transparent"
          />
          <Textarea
            aria-label="Form description"
            value={form.description}
            onChange={(e) => dispatch({ type: 'setMeta', description: e.target.value })}
            placeholder="Add a description"
            rows={1}
            className="min-h-0 resize-none border-transparent bg-transparent px-2 py-1 text-muted-foreground shadow-none hover:border-input dark:bg-transparent"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setConfirmNew(true)} className="mt-1 shrink-0">
          <FilePlus2 data-icon="inline-start" />
          New form
        </Button>
      </div>

      <div data-drop-zone>
        {fields.length === 0 || (rest.length === 0 && drag) ? (
          <div
            className={cn(
              'flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition-colors',
              emptyTarget && 'border-primary bg-primary/5 text-foreground',
            )}
          >
            <MousePointerClick className="size-6" />
            <p>Drag a field here, or pick one from the list.</p>
          </div>
        ) : (
          <ol className="grid gap-3" aria-label="Fields">
            {fields.map((field, i) => (
              <FieldCard
                key={field.id}
                field={field}
                position={i + 1}
                count={fields.length}
                selected={field.id === selectedId}
                dragging={field.id === draggedId}
                dropMark={dropMark(field)}
                begin={begin}
                onSelect={() => dispatch({ type: 'select', id: field.id })}
                onDuplicate={() => duplicate(field)}
                onRemove={() => remove(field)}
                onKeyDown={onKeyDown(field)}
              >
                {field.id === selectedId ? inlineInspector : null}
              </FieldCard>
            ))}
          </ol>
        )}
      </div>
      <p id="reorder-help" className="mt-3 hidden text-xs text-muted-foreground sm:block">
        <Kbd>↑</Kbd> <Kbd>↓</Kbd> step through fields · <Kbd>Alt</Kbd> + <Kbd>↑</Kbd> <Kbd>↓</Kbd> move ·{' '}
        <Kbd>Del</Kbd> delete · <Kbd>{MOD}</Kbd> <Kbd>D</Kbd> duplicate
      </p>

      <AlertDialog open={confirmNew} onOpenChange={setConfirmNew}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a blank form?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the title, description and all {fields.length} fields. Export the form first if you want
              to keep it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                dispatch({ type: 'replace', form: emptyForm() })
                setConfirmNew(false)
                announce('Started a blank form')
              }}
            >
              Start blank
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border bg-muted px-1 font-sans text-[0.7rem] text-foreground/80">{children}</kbd>
)
