/**
 * Where something dropped at height `y` lands in a vertical list: in front of the first item
 * whose middle is below the pointer. `mids` are the middles of the items, top to bottom, not
 * counting the one being dragged.
 */
export function dropIndex(mids: number[], y: number): number {
  const index = mids.findIndex((mid) => y < mid)
  return index === -1 ? mids.length : index
}

export interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

/** Whether a point is inside a rectangle grown by `slack` on every side, so near misses still count. */
export const isNear = (rect: Rect, x: number, y: number, slack: number) =>
  x >= rect.left - slack && x <= rect.right + slack && y >= rect.top - slack && y <= rect.bottom + slack
