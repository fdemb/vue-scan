import type { ComponentInternalInstance } from 'vue'
import { OUTLINE_ARRAY_SIZE, drawCanvas, initCanvas, updateOutlines, updateScroll } from './canvas'
import type { ActiveOutline, BlueprintOutline, OutlineData } from './types'
import { isPaused } from '../toolbar/state'

import OverlayWorker from './worker?worker&inline'

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

function getComponentElements(instance: ComponentInternalInstance): Element[] {
  const elements: Element[] = []
  
  const el = instance.vnode?.el
  
  if (el instanceof Element) {
    elements.push(el)
  } else if (el instanceof Text) {
    if (el.parentElement) {
      elements.push(el.parentElement)
    }
  }
  
  if (instance.subTree) {
    collectElements(instance.subTree, elements)
  }
  
  return elements
}

function collectElements(vnode: any, elements: Element[]): void {
  if (!vnode) return
  
  if (vnode.el instanceof Element && !elements.includes(vnode.el)) {
    elements.push(vnode.el)
  }
  
  if (Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      if (child && typeof child === 'object') {
        collectElements(child, elements)
      }
    }
  }
}

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

export function outlineComponent(uid: number, name: string, instance: ComponentInternalInstance): void {
  if (!isInitialized || isPaused.value) return
  
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
// IntersectionObserver-based rect collection
// ============================================================================

interface IntersectionState {
  resolveNext: ((value: IntersectionObserverEntry[]) => void) | null
  seenElements: Set<Element>
  uniqueElements: Set<Element>
  done: boolean
}

function onIntersect(
  this: IntersectionState,
  entries: IntersectionObserverEntry[],
  observer: IntersectionObserver,
): void {
  const newEntries: IntersectionObserverEntry[] = []

  for (const entry of entries) {
    const element = entry.target
    if (!this.seenElements.has(element)) {
      this.seenElements.add(element)
      newEntries.push(entry)
    }
  }

  if (newEntries.length > 0 && this.resolveNext) {
    this.resolveNext(newEntries)
    this.resolveNext = null
  }

  if (this.seenElements.size === this.uniqueElements.size) {
    observer.disconnect()
    this.done = true
    if (this.resolveNext) {
      this.resolveNext([])
    }
  }
}

async function* getBatchedRectMap(
  elements: Element[],
): AsyncGenerator<IntersectionObserverEntry[], void, unknown> {
  const state: IntersectionState = {
    uniqueElements: new Set(elements),
    seenElements: new Set(),
    resolveNext: null,
    done: false,
  }
  const observer = new IntersectionObserver(onIntersect.bind(state))

  for (const element of state.uniqueElements) {
    observer.observe(element)
  }

  while (!state.done) {
    const entries = await new Promise<IntersectionObserverEntry[]>((resolve) => {
      state.resolveNext = resolve
    })
    if (entries.length > 0) {
      yield entries
    }
  }
}

const SupportedArrayBuffer =
  typeof SharedArrayBuffer !== 'undefined' ? SharedArrayBuffer : ArrayBuffer

async function flushOutlines(): Promise<void> {
  if (blueprintIds.size === 0) return

  const elements: Element[] = []
  for (const uid of blueprintIds) {
    const blueprint = blueprintMap.get(uid)
    if (!blueprint) continue
    for (const element of blueprint.elements) {
      elements.push(element)
    }
  }

  const rectsMap = new Map<Element, DOMRect>()

  for await (const entries of getBatchedRectMap(elements)) {
    for (const entry of entries) {
      const rect = entry.intersectionRect
      if (entry.isIntersecting && rect.width && rect.height) {
        rectsMap.set(entry.target, rect)
      }
    }

    const blueprints: BlueprintOutline[] = []
    const blueprintRects: DOMRect[] = []
    const ids: number[] = []

    for (const uid of blueprintIds) {
      const blueprint = blueprintMap.get(uid)
      if (!blueprint) continue

      const rects: DOMRect[] = []
      for (const element of blueprint.elements) {
        const rect = rectsMap.get(element)
        if (rect) rects.push(rect)
      }

      if (rects.length === 0) continue

      blueprints.push(blueprint)
      blueprintRects.push(mergeRects(rects))
      ids.push(uid)
    }

    if (blueprints.length > 0) {
      const arrayBuffer = new SupportedArrayBuffer(
        blueprints.length * OUTLINE_ARRAY_SIZE * 4
      )
      const sharedView = new Float32Array(arrayBuffer)
      const blueprintNames = new Array(blueprints.length)
      let outlineData: OutlineData[] | undefined

      for (let i = 0, len = blueprints.length; i < len; i++) {
        const blueprint = blueprints[i]
        const id = ids[i]
        const { x, y, width, height } = blueprintRects[i]
        const { count, name } = blueprint

        if (worker) {
          const scaledIndex = i * OUTLINE_ARRAY_SIZE
          sharedView[scaledIndex] = id
          sharedView[scaledIndex + 1] = count
          sharedView[scaledIndex + 2] = x
          sharedView[scaledIndex + 3] = y
          sharedView[scaledIndex + 4] = width
          sharedView[scaledIndex + 5] = height
          blueprintNames[i] = name
        } else {
          outlineData ||= new Array(blueprints.length)
          outlineData[i] = { id, name, count, x, y, width, height }
        }
      }

      if (worker) {
        worker.postMessage({
          type: 'draw-outlines',
          data: arrayBuffer,
          names: blueprintNames,
        })
      } else if (canvas && ctx && outlineData) {
        updateOutlines(activeOutlines, outlineData)
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(draw)
        }
      }
    }
  }

  blueprintIds.clear()
  blueprintMap.clear()
}

function draw(): void {
  if (!ctx || !canvas) return

  const shouldContinue = drawCanvas(ctx, canvas, dpr, activeOutlines)

  if (shouldContinue) {
    animationFrameId = requestAnimationFrame(draw)
  } else {
    animationFrameId = null
  }
}

const IS_OFFSCREEN_CANVAS_WORKER_SUPPORTED =
  typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined'

function getDpr(): number {
  return Math.min(window.devicePixelRatio || 1, 2)
}

export function initOverlay(): HTMLElement | null {
  if (typeof window === 'undefined') return null
  if (isInitialized) return null

  cleanup()

  const host = document.createElement('div')
  host.setAttribute('data-vue-scan', 'true')
  const shadowRoot = host.attachShadow({ mode: 'open' })

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
      console.warn('[vue-scan] Failed to initialize OffscreenCanvas worker:', e)
      worker = null
    }
  }

  if (!worker) {
    ctx = initCanvas(canvasEl, dpr) as CanvasRenderingContext2D
  }

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

  flushIntervalId = window.setInterval(() => {
    if (blueprintIds.size > 0) {
      requestAnimationFrame(() => flushOutlines())
    }
  }, 32)

  document.body.appendChild(host)
  isInitialized = true

  return host
}

export function cleanup(): void {
  const host = document.querySelector('[data-vue-scan]')
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

export function isOverlayActive(): boolean {
  return isInitialized
}
