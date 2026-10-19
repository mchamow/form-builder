import { useSyncExternalStore } from 'react'

/** Whether a media query matches, kept up to date. Without matchMedia (tests) it reports `fallback`. */
export function useMediaQuery(query: string, fallback = true): boolean {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  return useSyncExternalStore(
    (onChange) => {
      if (!supported) return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => (supported ? window.matchMedia(query).matches : fallback),
    () => fallback,
  )
}
