import { Check, Copy, Download, FileUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { exportForm, fieldKeys, fileName, readImport, type Form } from './schema'

function describe(form: Form): string {
  const n = form.fields.length
  if (n === 0) return 'No fields yet.'
  const keys = fieldKeys(form.fields)
  const shown = keys.slice(0, 3).join(', ')
  return `${n} field${n === 1 ? '' : 's'}, answers keyed as ${shown}${n > 3 ? ` and ${n - 3} more` : ''}.`
}

export function ExportDialog({ form, open, onOpenChange }: { form: Form; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false)
  const json = exportForm(form)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked: the JSON is still there to select by hand.
    }
  }

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: fileName(form.title) })
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export form</DialogTitle>
          <DialogDescription>{describe(form)} Import it here again later, or use it in your own code.</DialogDescription>
        </DialogHeader>
        <Textarea
          aria-label="Form JSON"
          readOnly
          value={json}
          rows={12}
          className="max-h-[50svh] font-mono text-xs"
        />
        <DialogFooter>
          <Button variant="outline" onClick={download}>
            <Download data-icon="inline-start" />
            Download
          </Button>
          <Button onClick={copy}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (form: Form) => void
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const close = (next: boolean) => {
    if (!next) {
      setText('')
      setError(null)
    }
    onOpenChange(next)
  }

  const submit = () => {
    const result = readImport(text)
    if ('error' in result) return setError(result.error)
    onImport(result.form)
    close(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import form</DialogTitle>
          <DialogDescription>Paste a form exported from here, or open a .json file. It replaces the current form.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="import-json">Form JSON</Label>
          <Textarea
            id="import-json"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError(null)
            }}
            rows={10}
            placeholder={'{\n  "title": "…",\n  "fields": [ … ]\n}'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'import-error' : undefined}
            className="max-h-[45svh] font-mono text-xs"
          />
          {error && (
            <p id="import-error" role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="JSON file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setText(await file.text())
              setError(null)
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => fileInput.current?.click()}>
            <FileUp data-icon="inline-start" />
            Open file…
          </Button>
          <Button onClick={submit} disabled={!text.trim()}>
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
