/**
 * Canvas drawing logic for component outlines
 * Works with both HTMLCanvasElement (main thread) and OffscreenCanvas (worker)
 */

import type { ActiveOutline, OutlineData } from './types'

// Constants
export const OUTLINE_ARRAY_SIZE = 6 // [id, count, x, y, width, height]
const TOTAL_FRAMES = 45 // ~750ms at 60fps
const INTERPOLATION_SPEED = 0.2
const SNAP_THRESHOLD = 0.5
const MAX_LABEL_LENGTH = 40
const MAX_PARTS_LENGTH = 4

const PRIMARY_COLOR = '52,152,108' // #34986C - darker Vue green
const MONO_FONT = 'Menlo,Consolas,Monaco,Liberation Mono,Lucida Console,monospace'

/**
 * Linear interpolation with snap threshold
 */
function lerp(start: number, end: number): number {
  const delta = end - start
  if (Math.abs(delta) < SNAP_THRESHOLD) return end
  return start + delta * INTERPOLATION_SPEED
}

/**
 * Get label text for a group of outlines at the same position
 */
function getLabelText(outlines: ActiveOutline[]): string {
  // Group by name and sum counts
  const nameByCount = new Map<string, number>()
  for (const { name, count } of outlines) {
    nameByCount.set(name, (nameByCount.get(name) || 0) + count)
  }

  // Invert to group names by count
  const countByNames = new Map<number, string[]>()
  for (const [name, count] of nameByCount) {
    const names = countByNames.get(count)
    if (names) {
      names.push(name)
    } else {
      countByNames.set(count, [name])
    }
  }

  // Sort by count descending and build label
  const sortedEntries = [...countByNames.entries()].sort((a, b) => b[0] - a[0])
  
  let labelText = ''
  for (let i = 0; i < sortedEntries.length; i++) {
    const [count, names] = sortedEntries[i]
    let part = `${names.slice(0, MAX_PARTS_LENGTH).join(', ')} ×${count}`
    if (part.length > MAX_LABEL_LENGTH) {
      part = `${part.slice(0, MAX_LABEL_LENGTH)}…`
    }
    if (i > 0) labelText += ', '
    labelText += part
  }

  if (labelText.length > MAX_LABEL_LENGTH) {
    return `${labelText.slice(0, MAX_LABEL_LENGTH)}…`
  }

  return labelText
}

/**
 * Calculate total area of outlines (for sorting)
 */
function getAreaFromOutlines(outlines: ActiveOutline[]): number {
  let area = 0
  for (const outline of outlines) {
    area += outline.width * outline.height
  }
  return area
}

/**
 * Initialize canvas context with device pixel ratio scaling
 */
export function initCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  dpr: number
): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d', { alpha: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null
  if (ctx) {
    ctx.scale(dpr, dpr)
  }
  return ctx
}

/**
 * Update or add outlines to the active set
 */
export function updateOutlines(
  activeOutlines: Map<string, ActiveOutline>,
  outlines: OutlineData[]
): void {
  for (const { id, name, count, x, y, width, height } of outlines) {
    const key = String(id)
    const existingOutline = activeOutlines.get(key)

    if (existingOutline) {
      // Re-render: restart animation, update target position
      existingOutline.count++
      existingOutline.frame = 0
      existingOutline.targetX = x
      existingOutline.targetY = y
      existingOutline.targetWidth = width
      existingOutline.targetHeight = height
    } else {
      // New outline
      activeOutlines.set(key, {
        id,
        name,
        count,
        x,
        y,
        width,
        height,
        targetX: x,
        targetY: y,
        targetWidth: width,
        targetHeight: height,
        frame: 0,
      })
    }
  }
}

/**
 * Update outline positions on scroll
 */
export function updateScroll(
  activeOutlines: Map<string, ActiveOutline>,
  deltaX: number,
  deltaY: number
): void {
  for (const outline of activeOutlines.values()) {
    outline.targetX = outline.x - deltaX
    outline.targetY = outline.y - deltaY
  }
}

/**
 * Draw all active outlines and animate them
 * Returns true if there are still outlines to animate
 */
export function drawCanvas(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  canvas: HTMLCanvasElement | OffscreenCanvas,
  dpr: number,
  activeOutlines: Map<string, ActiveOutline>
): boolean {
  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)

  // Group outlines by position for label merging
  const groupedOutlinesMap = new Map<string, ActiveOutline[]>()
  const rectMap = new Map<string, { x: number; y: number; width: number; height: number; alpha: number }>()

  for (const outline of activeOutlines.values()) {
    const { x, y, width, height, targetX, targetY, targetWidth, targetHeight, frame } = outline

    // Animate position
    if (targetX !== x) outline.x = lerp(x, targetX)
    if (targetY !== y) outline.y = lerp(y, targetY)
    if (targetWidth !== width) outline.width = lerp(width, targetWidth)
    if (targetHeight !== height) outline.height = lerp(height, targetHeight)

    const labelKey = `${targetX ?? x},${targetY ?? y}`
    const rectKey = `${labelKey},${targetWidth ?? width},${targetHeight ?? height}`

    // Group for labels
    const outlines = groupedOutlinesMap.get(labelKey)
    if (outlines) {
      outlines.push(outline)
    } else {
      groupedOutlinesMap.set(labelKey, [outline])
    }

    // Calculate alpha (fade out over TOTAL_FRAMES)
    const alpha = 1 - frame / TOTAL_FRAMES
    outline.frame++

    // Track rect with highest alpha
    const rect = rectMap.get(rectKey) || { x, y, width, height, alpha }
    if (alpha > rect.alpha) {
      rect.alpha = alpha
    }
    rectMap.set(rectKey, rect)
  }

  // Draw rectangles
  for (const { x, y, width, height, alpha } of rectMap.values()) {
    ctx.strokeStyle = `rgba(${PRIMARY_COLOR},${alpha})`
    ctx.lineWidth = 1

    // Offset by 0.5px for crisp 1px strokes on pixel boundaries
    const rx = Math.round(x) + 0.5
    const ry = Math.round(y) + 0.5
    const rw = Math.round(width)
    const rh = Math.round(height)

    ctx.beginPath()
    ctx.rect(rx, ry, rw, rh)
    ctx.stroke()
    ctx.fillStyle = `rgba(${PRIMARY_COLOR},${alpha * 0.1})`
    ctx.fill()
  }

  // Build label map
  ctx.font = `11px ${MONO_FONT}`
  const labelMap = new Map<string, {
    text: string
    width: number
    height: number
    alpha: number
    x: number
    y: number
    outlines: ActiveOutline[]
  }>()

  for (const outlines of groupedOutlinesMap.values()) {
    const first = outlines[0]
    const { x, y, frame } = first
    const alpha = 1 - frame / TOTAL_FRAMES
    const text = getLabelText(outlines)
    const { width } = ctx.measureText(text)
    const height = 11

    labelMap.set(`${x},${y},${width},${text}`, {
      text,
      width,
      height,
      alpha,
      x,
      y,
      outlines,
    })

    // Remove expired outlines
    if (frame > TOTAL_FRAMES) {
      for (const outline of outlines) {
        activeOutlines.delete(String(outline.id))
      }
    }
  }

  // Sort labels by area (larger first) and merge overlapping
  const sortedLabels = Array.from(labelMap.entries()).sort(
    ([, a], [, b]) => getAreaFromOutlines(b.outlines) - getAreaFromOutlines(a.outlines)
  )

  for (const [labelKey, label] of sortedLabels) {
    if (!labelMap.has(labelKey)) continue

    for (const [otherKey, otherLabel] of labelMap.entries()) {
      if (labelKey === otherKey) continue

      const { x, y, width, height } = label
      const { x: otherX, y: otherY, width: otherWidth, height: otherHeight } = otherLabel

      // Check overlap
      if (
        x + width > otherX &&
        otherX + otherWidth > x &&
        y + height > otherY &&
        otherY + otherHeight > y
      ) {
        label.text = getLabelText(label.outlines.concat(otherLabel.outlines))
        label.width = ctx.measureText(label.text).width
        labelMap.delete(otherKey)
      }
    }
  }

  // Draw labels
  for (const label of labelMap.values()) {
    const { x, y, alpha, width, height, text } = label

    let labelY = y - height - 4
    if (labelY < 0) labelY = 0

    ctx.fillStyle = `rgba(${PRIMARY_COLOR},${alpha})`
    ctx.fillRect(x, labelY, width + 4, height + 4)

    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.fillText(text, x + 2, labelY + height)
  }

  return activeOutlines.size > 0
}
