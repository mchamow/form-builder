import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { dropIndex, isNear } from './drop'
import type { FieldType } from './schema'

/** A new field from the palette, or a field already in the form. */
export type DragSource = { kind: 'new'; fieldType: FieldType } | { kind: 'move'; id: string }

export interface Drag {
  source: DragSource
  label: string
  width: number
  /** Where the floating copy's top-left corner goes. */
  left: number
  top: number
  /** Position in the form (not counting the dragged field), or null when not over the form. */
  index: number | null
}

interface Pending {
  source: DragSource
  label: string
  pointerId: number
  startX: number
  startY: number
  rect: DOMRect
}

/** How far the pointer travels before a press becomes a drag, so a click stays a click. */
const THRESHOLD = 5
/** Drops this close to the form still count, so a slightly-off release isn't lost. */
const SLACK = 32
/** Within this many pixels of the top or bottom of the window, the page scrolls along. */
const EDGE = 56
const SCROLL_STEP = 14

/**
 * Where a drop at (x, y) lands in the form. The form marks itself with `data-drop-zone`,
 * its fields with `data-field-id`.
 */
export function hitTest(x: number, y: number, source: DragSource): number | null {
  const zone = document.querySelector<HTMLElement>('[data-drop-zone]')
  if (!zone || !isNear(zone.getBoundingClientRect(), x, y, SLACK)) return null
  const mids = [...zone.querySelectorAll<HTMLElement>('[data-field-id]')]
    .filter((el) => source.kind !== 'move' || el.dataset.fieldId !== source.id)
    .map((el) => {
      const rect = el.getBoundingClientRect()
      return rect.top + rect.height / 2
    })
  return dropIndex(mids, y)
}

/**
 * Pointer-event drag and drop: the same code for mouse, pen and touch. A mouse can grab a field
 * anywhere but its buttons; touch and pen grab it by its handle (`data-drag-handle`), so swiping
 * still scrolls the page. Escape or a cancelled pointer drops nothing.
 */
export function useFieldDrag(onDrop: (source: DragSource, index: number) => void) {
  const [drag, setDrag] = useState<Drag | null>(null)
  const pending = useRef<Pending | null>(null)
  const current = useRef<Drag | null>(null)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })

  const begin = useCallback((event: ReactPointerEvent<HTMLElement>, source: DragSource, label: string) => {
    if (event.button !== 0 || !event.isPrimary || pending.current) return
    const target = event.target as HTMLElement
    const fromHandle = target.closest('[data-drag-handle]') !== null
    const fromControl = target.closest('[data-no-drag], input, textarea') !== null
    if (!fromHandle && (event.pointerType !== 'mouse' || fromControl)) return
    pending.current = {
      source,
      label,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
    }
  }, [])

  useEffect(() => {
    let pointer = { x: 0, y: 0 }
    let frame = 0

    const show = (next: Drag | null) => {
      current.current = next
      setDrag(next)
    }

    const follow = () => {
      const p = pending.current
      const d = current.current
      if (!p || !d) return
      show({
        ...d,
        left: pointer.x - Math.min(p.startX - p.rect.left, d.width - 24),
        top: pointer.y - Math.min(p.startY - p.rect.top, 24),
        index: hitTest(pointer.x, pointer.y, p.source),
      })
    }

    const autoScroll = () => {
      frame = requestAnimationFrame(autoScroll)
      const step = pointer.y < EDGE ? -SCROLL_STEP : pointer.y > window.innerHeight - EDGE ? SCROLL_STEP : 0
      if (step === 0) return
      const before = window.scrollY
      window.scrollBy(0, step)
      if (window.scrollY !== before) follow()
    }

    const stop = () => {
      cancelAnimationFrame(frame)
      pending.current = null
      if (current.current) show(null)
    }

    const onMove = (event: PointerEvent) => {
      const p = pending.current
      if (!p || event.pointerId !== p.pointerId) return
      pointer = { x: event.clientX, y: event.clientY }
      if (!current.current) {
        if (Math.hypot(pointer.x - p.startX, pointer.y - p.startY) < THRESHOLD) return
        current.current = { source: p.source, label: p.label, width: Math.min(p.rect.width, 320), left: 0, top: 0, index: null }
        frame = requestAnimationFrame(autoScroll)
      }
      event.preventDefault()
      follow()
    }

    const onUp = (event: PointerEvent) => {
      const p = pending.current
      if (!p || event.pointerId !== p.pointerId) return
      const d = current.current
      stop()
      if (d && d.index !== null) onDropRef.current(d.source, d.index)
    }

    const onCancel = (event: PointerEvent) => {
      if (pending.current?.pointerId === event.pointerId) stop()
    }

    // A drag that started is never also a click on what was grabbed.
    const onClick = (event: MouseEvent) => {
      if (!swallowClick) return
      swallowClick = false
      event.preventDefault()
      event.stopPropagation()
    }
    let swallowClick = false
    const onDownCapture = () => {
      swallowClick = false
    }
    const onUpCapture = (event: PointerEvent) => {
      if (current.current && pending.current?.pointerId === event.pointerId) {
        swallowClick = true
        setTimeout(() => (swallowClick = false), 0)
      }
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !pending.current) return
      if (current.current) {
        // This Escape was for the drag; the rest of the page shouldn't also act on it.
        event.preventDefault()
        event.stopPropagation()
      }
      stop()
    }

    window.addEventListener('pointerdown', onDownCapture, true)
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUpCapture, true)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointerdown', onDownCapture, true)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUpCapture, true)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [])

  return { drag, begin }
}
