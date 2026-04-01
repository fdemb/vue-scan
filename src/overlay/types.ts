/**
 * Data passed from main thread to worker for drawing
 */
export interface OutlineData {
  id: number
  name: string
  count: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * Compact array format for efficient worker transfer
 * [id, count, x, y, width, height]
 */
export type InlineOutlineData = [
  id: number,
  count: number,
  x: number,
  y: number,
  width: number,
  height: number,
]

/**
 * Active outline being animated on canvas
 */
export interface ActiveOutline {
  id: number
  name: string
  count: number
  /** Current x position (animated) */
  x: number
  /** Current y position (animated) */
  y: number
  /** Current width (animated) */
  width: number
  /** Current height (animated) */
  height: number
  /** Target x position */
  targetX: number
  /** Target y position */
  targetY: number
  /** Target width */
  targetWidth: number
  /** Target height */
  targetHeight: number
  /** Current animation frame (0 to TOTAL_FRAMES) */
  frame: number
}

/**
 * Blueprint for an outline - collected before flushing to canvas
 */
export interface BlueprintOutline {
  name: string
  count: number
  elements: Element[]
}

/**
 * Worker message types
 */
export type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; width: number; height: number; dpr: number }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'scroll'; deltaX: number; deltaY: number }
  | { type: 'draw-outlines'; data: ArrayBuffer; names: string[] }
