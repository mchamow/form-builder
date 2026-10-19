import { Eye, FileDown, FileUp, GripVertical, Hammer } from 'lucide-react'
import { useCallback, useEffect, useReducer, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Canvas, Palette } from './Builder'
import { FormPreview } from './FormPreview'
import { Inspector, InspectorEmpty } from './Inspector'
import { ExportDialog, ImportDialog } from './JsonDialogs'
import { reducer } from './reducer'
import { fieldName, typeLabel, type FieldType } from './schema'
import { load, save } from './storage'
import { useFieldDrag, type DragSource } from './useFieldDrag'
import { useMediaQuery } from './useMediaQuery'

type Mode = 'build' | 'preview'

const newId = () => crypto.randomUUID()

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ form: load(newId), selectedId: null }))
  const [mode, setMode] = useState<Mode>('build')
  const [dialog, setDialog] = useState<'import' | 'export' | null>(null)
  const [message, setMessage] = useState('')
  const wide = useMediaQuery('(min-width: 64rem)')
  const { form, selectedId } = state
  const selected = form.fields.find((f) => f.id === selectedId) ?? null

  useEffect(() => save(form), [form])

  const add = (fieldType: FieldType, index: number) => {
    dispatch({ type: 'add', fieldType, id: newId(), index })
    setMessage(`Added ${typeLabel(fieldType)} field at position ${index + 1}`)
  }

  const onDrop = useCallback(
    (source: DragSource, index: number) => {
      if (source.kind === 'new') {
        dispatch({ type: 'add', fieldType: source.fieldType, id: newId(), index })
        setMessage(`Added ${typeLabel(source.fieldType)} field at position ${index + 1}`)
      } else {
        dispatch({ type: 'move', id: source.id, index })
        setMessage(`Moved to position ${index + 1}`)
      }
    },
    [],
  )
  const { drag, begin } = useFieldDrag(onDrop)

  const inspector = selected && <Inspector field={selected} fields={form.fields} dispatch={dispatch} />

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <span aria-hidden className="text-2xl">
            🧩
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">Form Builder</h1>
            <p className="hidden text-xs text-muted-foreground md:block">Day 28 of 100 Days of React · saved in this browser</p>
          </div>
          <ToggleGroup
            aria-label="Mode"
            variant="outline"
            spacing={0}
            value={[mode]}
            onValueChange={(value: string[]) => {
              if (value[0] === 'build' || value[0] === 'preview') setMode(value[0])
            }}
          >
            <ToggleGroupItem value="build" aria-label="Build">
              <Hammer />
              <span className="hidden sm:inline">Build</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" aria-label="Preview">
              <Eye />
              <span className="hidden sm:inline">Preview</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="icon" className="sm:w-auto sm:gap-1.5 sm:px-2.5" aria-label="Import" onClick={() => setDialog('import')}>
            <FileUp />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="icon" className="sm:w-auto sm:gap-1.5 sm:px-2.5" aria-label="Export" onClick={() => setDialog('export')}>
            <FileDown />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {mode === 'build' ? (
          <div className="grid gap-6 lg:grid-cols-[11.5rem_minmax(0,1fr)_19rem] lg:items-start">
            <Palette
              begin={begin}
              onAdd={(type) => {
                const at = form.fields.findIndex((f) => f.id === selectedId)
                add(type, at === -1 ? form.fields.length : at + 1)
              }}
            />
            <Canvas
              state={state}
              dispatch={dispatch}
              drag={drag}
              begin={begin}
              announce={setMessage}
              inlineInspector={wide ? null : inspector}
            />
            {wide && (
              <aside className="sticky top-20">
                {selected ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="truncate">{fieldName(selected)}</CardTitle>
                      <CardDescription>Field settings</CardDescription>
                    </CardHeader>
                    <CardContent>{inspector}</CardContent>
                  </Card>
                ) : (
                  <InspectorEmpty />
                )}
              </aside>
            )}
          </div>
        ) : (
          <FormPreview form={form} />
        )}
      </main>

      {drag && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex rotate-1 items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium shadow-lg ring-1 ring-primary/30"
          style={{ left: drag.left, top: drag.top, width: drag.width }}
        >
          <GripVertical className="size-4 text-muted-foreground" />
          <span className="truncate">{drag.label}</span>
        </div>
      )}

      <p role="status" className="sr-only">
        {message}
      </p>

      <ExportDialog form={form} open={dialog === 'export'} onOpenChange={(open) => setDialog(open ? 'export' : null)} />
      <ImportDialog
        open={dialog === 'import'}
        onOpenChange={(open) => setDialog(open ? 'import' : null)}
        onImport={(imported) => {
          dispatch({ type: 'replace', form: imported })
          setMode('build')
          setMessage(`Imported ${imported.title || 'a form'} with ${imported.fields.length} fields`)
        }}
      />
    </div>
  )
}
