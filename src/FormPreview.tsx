import { CircleCheck, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Field, Form } from './schema'
import { emptyValue, submission, validateForm, type Value } from './validate'

const controlId = (field: Field) => `answer-${field.id}`

/**
 * The element to focus for a field's answer. Base UI's checkbox and radios keep the id on a hidden
 * input, so look for whatever in the field can actually take focus (the checked or first radio).
 */
function focusAnswer(field: Field) {
  const wrapper = document.querySelector(`[data-answer-for="${field.id}"]`)
  const candidates = wrapper?.querySelectorAll<HTMLElement>(
    'input, textarea, button, [role=radio], [role=checkbox], [role=combobox]',
  )
  const target = [...(candidates ?? [])].find((el) => el.tabIndex >= 0 && el.getAttribute('aria-hidden') !== 'true')
  target?.focus()
}

function Required() {
  return (
    <span aria-hidden className="ml-0.5 text-destructive">
      *
    </span>
  )
}

function Control({
  field,
  value,
  error,
  describedBy,
  onChange,
}: {
  field: Field
  value: Value
  error: string | undefined
  describedBy: string | undefined
  onChange: (value: Value) => void
}) {
  const id = controlId(field)
  const common = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': field.required || undefined,
  }
  const text = typeof value === 'string' ? value : ''
  switch (field.type) {
    case 'textarea':
      return <Textarea {...common} rows={4} placeholder={field.placeholder} value={text} onChange={(e) => onChange(e.target.value)} />
    case 'select': {
      const items = field.options.map((o) => ({ value: o, label: o || '(blank)' }))
      return (
        <Select items={items} value={text || null} onValueChange={(v) => onChange(typeof v === 'string' ? v : '')}>
          <SelectTrigger {...common} aria-labelledby={`${id}-label`} className="w-full">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {items.map((item, i) => (
              <SelectItem key={i} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    case 'radio':
      return (
        <RadioGroup
          {...common}
          aria-labelledby={`${id}-label`}
          value={text || null}
          onValueChange={(v) => onChange(typeof v === 'string' ? v : '')}
          className="gap-2.5"
        >
          {field.options.map((option, i) => (
            <label key={i} className="flex w-fit items-center gap-2.5 text-sm">
              <RadioGroupItem value={option} aria-labelledby={`${id}-option-${i}`} />
              <span id={`${id}-option-${i}`}>{option || '(blank)'}</span>
            </label>
          ))}
        </RadioGroup>
      )
    case 'checkbox':
      return (
        <label className="flex w-fit items-start gap-2.5 text-sm">
          <Checkbox
            {...common}
            aria-labelledby={`${id}-label`}
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked === true)}
            className="mt-0.5"
          />
          <span id={`${id}-label`} className="font-medium">
            {field.label || 'Untitled'}
            {field.required && <Required />}
          </span>
        </label>
      )
    default:
      return (
        <Input
          {...common}
          type={field.type}
          inputMode={field.type === 'number' ? 'decimal' : undefined}
          step={field.type === 'number' ? 'any' : undefined}
          placeholder={field.placeholder}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      )
  }
}

export function FormPreview({ form }: { form: Form }) {
  const [values, setValues] = useState<Record<string, Value>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  // Errors appear after the first submit, then follow every change.
  const errors = submitted ? validateForm(form.fields, values) : {}

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    const found = validateForm(form.fields, values)
    const first = form.fields.find((f) => found[f.id])
    if (first) return focusAnswer(first)
    setResult(submission(form.fields, values))
  }

  const reset = () => {
    setValues({})
    setSubmitted(false)
    setResult(null)
  }

  if (result) {
    return (
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
            Submitted
          </CardTitle>
          <CardDescription>Here's what the form would send:</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <pre
            aria-label="Submitted data"
            className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
          <Button variant="outline" className="justify-self-start" onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            Fill in again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle className="text-xl">{form.title || 'Untitled form'}</CardTitle>
        {form.description && <CardDescription className="whitespace-pre-line">{form.description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={onSubmit} aria-label={form.title || 'Untitled form'} className="grid gap-6">
          {form.fields.length === 0 && (
            <p className="text-sm text-muted-foreground">This form has no fields yet. Switch back to Build to add some.</p>
          )}
          {form.fields.map((field) => {
            const id = controlId(field)
            const error = errors[field.id]
            const describedBy = [field.help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
            const value = values[field.id] ?? emptyValue(field)
            const Wrapper = field.type === 'radio' ? 'fieldset' : 'div'
            return (
              <Wrapper key={field.id} data-answer-for={field.id} className="grid gap-2">
                {field.type !== 'checkbox' &&
                  (field.type === 'radio' ? (
                    <legend id={`${id}-label`} className="mb-2 text-sm font-medium">
                      {field.label || 'Untitled'}
                      {field.required && <Required />}
                    </legend>
                  ) : (
                    <Label htmlFor={id} id={`${id}-label`} className="gap-0">
                      {field.label || 'Untitled'}
                      {field.required && <Required />}
                    </Label>
                  ))}
                <Control
                  field={field}
                  value={value}
                  error={error}
                  describedBy={describedBy}
                  onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
                />
                {field.help && (
                  <p id={`${id}-help`} className="text-xs text-muted-foreground">
                    {field.help}
                  </p>
                )}
                {error && (
                  <p id={`${id}-error`} className="text-xs font-medium text-destructive">
                    {error}
                  </p>
                )}
              </Wrapper>
            )
          })}
          {form.fields.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Clear answers
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
