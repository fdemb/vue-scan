/**
 * Overlay system for visualizing Vue component updates
 * Creates a canvas overlay and draws outlines around components when they update
 */

import type { ComponentInternalInstance } from 'vue'
import { OUTLINE_ARRAY_SIZE, drawCanvas, initCanvas, updateOutlines, updateScroll } from './canvas'
import type { ActiveOutline, BlueprintOutline, OutlineData } from './types'

// Worker will be loaded via Vite's worker import
import OverlayWorker from './worker?worker&inline'

// ============================================================================
// State
// ============================================================================

let worker: Worker | null = null
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let dpr = 1
let animationFrameId: number | null = null
let flushIntervalId: number | null = null
let isInitialized = false

const activeOutlines = new Map<string, ActiveOutline>()
const blueprintMap = new Map<number, BlueprintOutline>()
const blueprintIds = new Set<number>()

// ============================================================================
// DOM Element extraction from Vue component instances
// ============================================================================

/**
 * Get DOM elements for a Vue component instance
 * Vue components can render multiple root elements (fragments)
 */
function getComponentElements(instance: ComponentInternalInstance): Element[] {
  const elements: Element[] = []
  
  // instance.vnode.el is the root DOM element (or first element for fragments)
  // For fragments, we need to traverse instance.subTree
  const el = instance.vnode?.el
  
  if (el instanceof Element) {
    elements.push(el)
  } else if (el instanceof Text) {
    // Text node - get parent element
    if (el.parentElement) {
      elements.push(el.parentElement)
    }
  }
  
  // Handle fragments - walk the subTree to find all root elements
  if (instance.subTree) {
    collectElements(instance.subTree, elements)
  }
  
  return elements
}

/**
 * Recursively collect Element nodes from a VNode tree
 */
function collectElements(vnode: any, elements: Element[]): void {
  if (!vnode) return
  
  if (vnode.el instanceof Element && !elements.includes(vnode.el)) {
    elements.push(vnode.el)
  }
  
  // Fragment children
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (child && typeof child === 'object') {
        collectElements(child, elements)
      }
    }
  }
}

/**
 * Merge multiple DOMRects into one bounding rect
 */
function mergeRects(rects: DOMRect[]): DOMRect {
  if (rects.length === 0) {
    return new DOMRect(0, 0, 0, 0)
  }
  if (rects.length === 1) {
    return rects[0]
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const rect of rects) {
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  return new DOMRect(minX, minY, maxX - minX, maxY - minY)
}

// ============================================================================
// Blueprint management
// ============================================================================

/**
 * Add a component to the blueprint queue for the next flush
 */
export function outlineComponent(uid: number, name: string, instance: ComponentInternalInstance): void {
  if (!isInitialized) return
  
  const elements = getComponentElements(instance)
  if (elements.length === 0) return

  const existing = blueprintMap.get(uid)
  if (existing) {
    existing.count++
  } else {
    blueprintMap.set(uid, {
      name,
      count: 1,
      elements,
    })
    blueprintIds.add(uid)
  }
}

// ============================================================================
// Flush and draw
// ============================================================================

const SupportedArrayBuffer =
  typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : ArrayBuffer

/**
 * Flush all queued blueprints to the canvas
 */
async function flushOutlines(): Promise<void> {
  if (blueprintIds.size === 0) return

  const blueprints: BlueprintOutline[] = []
  const blueprintRects: DOMRect[] = []
  const ids: number[] = []

  for (const uid of blueprintIds) {
    const blueprint = blueprintMap.get(uid)
    if (!blueprint) continue

    // Get bounding rects for all elements
    const rects: DOMRect[] = []
    for (const element of blueprint.elements) {
      const rect = element.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        rects.push(rect)
      }
    }

    if (rects.length === 0) continue

    blueprints.push(blueprint)
    blueprintRects.push(mergeRects(rects))
    ids.push(uid)
  }

  if (blueprints.length === 0) {
    blueprintIds.clear()
    blueprintMap.clear()
    return
  }

  if (worker) {
    // Send to worker via SharedArrayBuffer
    const arrayBuffer = new SupportedArrayBuffer(
      blueprints.length * OUTLINE_ARRAY_SIZE * 4
    )
    const sharedView = new Float32Array(arrayBuffer)
    const blueprintNames = new Array(blueprints.length)

    for (let i = 0; i < blueprints.length; i++) {
      const blueprint = blueprints[i]
      const { x, y, width, height } = blueprintRects[i]
      const scaledIndex = i * OUTLINE_ARRAY_SIZE

      sharedView[scaledIndex] = ids[i]
      sharedView[scaledIndex + 1] = blueprint.count
      sharedView[scaledIndex + 2] = x
      sharedView[scaledIndex + 3] = y
      sharedView[scaledIndex + 4] = width
      sharedView[scaledIndex + 5] = height
      blueprintNames[i] = blueprint.name
    }

    worker.postMessage({
      type: 'draw-outlines',
      data: arrayBuffer,
      names: blueprintNames,
    })
  } else if (canvas && ctx) {
    // Draw on main thread
    const outlineData: OutlineData[] = blueprints.map((blueprint, i) => ({
      id: ids[i],
      name: blueprint.name,
      count: blueprint.count,
      x: blueprintRects[i].x,
      y: blueprintRects[i].y,
      width: blueprintRects[i].width,
      height: blueprintRects[i].height,
    }))

    updateOutlines(activeOutlines, outlineData)
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(draw)
    }
  }

  // Clear blueprints
  blueprintIds.clear()
  blueprintMap.clear()
}

/**
 * Main thread draw loop (fallback when worker not available)
 */
function draw(): void {
  if (!ctx || !canvas) return

  const shouldContinue = drawCanvas(ctx, canvas, dpr, activeOutlines)

  if (shouldContinue) {
    animationFrameId = requestAnimationFrame(draw)
  } else {
    animationFrameId = null
  }
}

// ============================================================================
// Setup and cleanup
// ============================================================================

const IS_OFFSCREEN_CANVAS_WORKER_SUPPORTED =
  typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined'

function getDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2)
}

/**
 * Initialize the overlay canvas
 */
export function initOverlay(): HTMLElement | null {
  if (typeof window === 'undefined') return null
  if (isInitialized) return null

  cleanup()

  // Create host element with shadow DOM for isolation
  const host = document.createElement('div')
  host.setAttribute('data-vue-toolkit', 'true')
  const shadowRoot = host.attachShadow({ mode: 'open' })

  // Create canvas
  const canvasEl = document.createElement('canvas')
  canvasEl.style.position = 'fixed'
  canvasEl.style.top = '0'
  canvasEl.style.left = '0'
  canvasEl.style.pointerEvents = 'none'
  canvasEl.style.zIndex = '2147483646'
  canvasEl.setAttribute('aria-hidden', 'true')
  shadowRoot.appendChild(canvasEl)

  dpr = getDpr()
  canvas = canvasEl

  const { innerWidth, innerHeight } = window
  canvasEl.style.width = `${innerWidth}px`
  canvasEl.style.height = `${innerHeight}px`
  canvasEl.width = innerWidth * dpr
  canvasEl.height = innerHeight * dpr

  // Try to use OffscreenCanvas worker
  if (IS_OFFSCREEN_CANVAS_WORKER_SUPPORTED) {
    try {
      worker = new OverlayWorker()

      const offscreenCanvas = canvasEl.transferControlToOffscreen()
      worker.postMessage(
        {
          type: 'init',
          canvas: offscreenCanvas,
          width: canvasEl.width,
          height: canvasEl.height,
          dpr,
        },
        [offscreenCanvas]
      )
    } catch (e) {
      console.warn('[vue-toolkit] Failed to initialize OffscreenCanvas worker:', e)
      worker = null
    }
  }

  // Fallback to main thread canvas
  if (!worker) {
    ctx = initCanvas(canvasEl, dpr) as CanvasRenderingContext2D
  }

  // Handle resize
  let isResizeScheduled = false
  window.addEventListener('resize', () => {
    if (isResizeScheduled) return
    isResizeScheduled = true

    setTimeout(() => {
      const width = window.innerWidth
      const height = window.innerHeight
      dpr = getDpr()
      canvasEl.style.width = `${width}px`
      canvasEl.style.height = `${height}px`

      if (worker) {
        worker.postMessage({ type: 'resize', width, height, dpr })
      } else {
        canvasEl.width = width * dpr
        canvasEl.height = height * dpr
        if (ctx) {
          ctx.resetTransform()
          ctx.scale(dpr, dpr)
        }
        draw()
      }
      isResizeScheduled = false
    }, 32)
  })

  // Handle scroll
  let prevScrollX = window.scrollX
  let prevScrollY = window.scrollY
  let isScrollScheduled = false

  window.addEventListener('scroll', () => {
    if (isScrollScheduled) return
    isScrollScheduled = true

    setTimeout(() => {
      const { scrollX, scrollY } = window
      const deltaX = scrollX - prevScrollX
      const deltaY = scrollY - prevScrollY
      prevScrollX = scrollX
      prevScrollY = scrollY

      if (worker) {
        worker.postMessage({ type: 'scroll', deltaX, deltaY })
      } else {
        requestAnimationFrame(() => updateScroll(activeOutlines, deltaX, deltaY))
      }
      isScrollScheduled = false
    }, 32)
  })

  // Flush blueprints periodically (~30fps)
  flushIntervalId = window.setInterval(() => {
    if (blueprintIds.size > 0) {
      requestAnimationFrame(() => flushOutlines())
    }
  }, 32)

  document.body.appendChild(host)
  isInitialized = true

  return host
}

/**
 * Clean up the overlay
 */
export function cleanup(): void {
  const host = document.querySelector('[data-vue-toolkit]')
  if (host) {
    host.remove()
  }

  if (worker) {
    worker.terminate()
    worker = null
  }

  if (flushIntervalId) {
    clearInterval(flushIntervalId)
    flushIntervalId = null
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  canvas = null
  ctx = null
  isInitialized = false
  activeOutlines.clear()
  blueprintMap.clear()
  blueprintIds.clear()
}

/**
 * Check if overlay is initialized
 */
export function isOverlayActive(): boolean {
  return isInitialized
}
