import { ArrowDown, ArrowUp, Plus, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FIELD_ICONS } from './icons'
import type { Action } from './reducer'
import { FIELD_TYPES, fieldKeys, hasLength, hasOptions, hasPlaceholder, hasRange, isFieldType, type Field } from './schema'

const TYPE_ITEMS = FIELD_TYPES.map((t) => ({ value: t.type, label: t.label }))

function Row({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

export function InspectorEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      <SlidersHorizontal className="size-5" />
      Select a field to change its label, rules and options.
    </div>
  )
}

export function Inspector({
  field,
  fields,
  dispatch,
}: {
  field: Field
  fields: Field[]
  dispatch: (action: Action) => void
}) {
  const id = field.id
  const set = (patch: Partial<Pick<Field, 'label' | 'help' | 'placeholder' | 'min' | 'max'>>) =>
    dispatch({ type: 'update', id, patch })
  const key = fieldKeys(fields)[fields.indexOf(field)]
  const limits = hasLength(field.type)
    ? { min: 'Min length', max: 'Max length' }
    : hasRange(field.type)
      ? { min: 'Minimum', max: 'Maximum' }
      : null

  return (
    <section aria-label="Field settings" className="grid gap-4">
      <Row id="field-type" label="Type">
        <Select
          items={TYPE_ITEMS}
          value={field.type}
          onValueChange={(value) => isFieldType(value) && dispatch({ type: 'changeType', id, fieldType: value })}
        >
          <SelectTrigger id="field-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_ITEMS.map((item) => {
              const Icon = FIELD_ICONS[item.value]
              return (
                <SelectItem key={item.value} value={item.value}>
                  <Icon className="text-muted-foreground" />
                  {item.label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </Row>
      <Row id="field-label" label="Label">
        <Input id="field-label" value={field.label} onChange={(e) => set({ label: e.target.value })} />
        <p className="text-xs text-muted-foreground">
          Answers are saved as <code className="rounded bg-muted px-1 py-0.5 text-[0.7rem]">{key}</code>
        </p>
      </Row>
      <Row id="field-help" label="Help text">
        <Input id="field-help" value={field.help} onChange={(e) => set({ help: e.target.value })} placeholder="Optional hint" />
      </Row>
      {hasPlaceholder(field.type) && (
        <Row id="field-placeholder" label="Placeholder">
          <Input id="field-placeholder" value={field.placeholder} onChange={(e) => set({ placeholder: e.target.value })} />
        </Row>
      )}
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="field-required" id="field-required-label">
          Required
        </Label>
        <Switch
          id="field-required"
          aria-labelledby="field-required-label"
          checked={field.required}
          onCheckedChange={(required) => dispatch({ type: 'update', id, patch: { required } })}
        />
      </div>
      {limits && (
        <div className="grid grid-cols-2 gap-3">
          <Row id="field-min" label={limits.min}>
            <Input id="field-min" type="number" inputMode="numeric" value={field.min} onChange={(e) => set({ min: e.target.value })} />
          </Row>
          <Row id="field-max" label={limits.max}>
            <Input id="field-max" type="number" inputMode="numeric" value={field.max} onChange={(e) => set({ max: e.target.value })} />
          </Row>
        </div>
      )}
      {hasOptions(field.type) && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Options</legend>
          <ol className="grid gap-1.5">
            {field.options.map((option, i) => (
              <li key={i} className="flex items-center gap-1">
                <Input
                  aria-label={`Option ${i + 1}`}
                  value={option}
                  onChange={(e) => dispatch({ type: 'setOption', id, index: i, value: e.target.value })}
                  onKeyDown={(e) => {
                    // Enter on the last option adds another, like a list in a word processor.
                    if (e.key === 'Enter' && i === field.options.length - 1) {
                      e.preventDefault()
                      dispatch({ type: 'addOption', id })
                      requestAnimationFrame(() =>
                        document.querySelector<HTMLInputElement>(`[aria-label="Option ${i + 2}"]`)?.focus(),
                      )
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move option ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => dispatch({ type: 'moveOption', id, index: i, by: -1 })}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move option ${i + 1} down`}
                  disabled={i === field.options.length - 1}
                  onClick={() => dispatch({ type: 'moveOption', id, index: i, by: 1 })}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove option ${i + 1}`}
                  disabled={field.options.length <= 1}
                  onClick={() => dispatch({ type: 'removeOption', id, index: i })}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ol>
          <Button variant="outline" size="sm" className="justify-self-start" onClick={() => dispatch({ type: 'addOption', id })}>
            <Plus data-icon="inline-start" />
            Add option
          </Button>
        </fieldset>
      )}
    </section>
  )
}
