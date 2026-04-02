/**
 * Vue instrumentation layer - abstraction over Vue DevTools APIs
 * Requires __VUE_PROD_DEVTOOLS__: true in the app's bundler config for production
 */

import type { App, ComponentInternalInstance } from 'vue'

// ============================================================================
// Types
// ============================================================================

export interface DevToolsHook {
  id: string
  enabled?: boolean
  appRecords: AppRecord[]
  apps: Record<number, unknown>
  events: Map<string, Function[]>
  emit: (event: string, ...payload: unknown[]) => void
  on: (event: string, handler: Function) => () => void
  off: (event: string, handler: Function) => void
  once: (event: string, handler: Function) => void
  cleanupBuffer?: (matchArg: unknown) => boolean
}

export interface AppRecord {
  id: number
  app: App
  version: string
  types: Record<string, string | symbol>
}

export const enum DevToolsHooks {
  APP_INIT = 'app:init',
  APP_UNMOUNT = 'app:unmount',
  COMPONENT_UPDATED = 'component:updated',
  COMPONENT_ADDED = 'component:added',
  COMPONENT_REMOVED = 'component:removed',
  COMPONENT_EMIT = 'component:emit',
  PERFORMANCE_START = 'perf:start',
  PERFORMANCE_END = 'perf:end',
}

export interface ComponentUpdatePayload {
  app: App
  uid: number
  parentUid: number | undefined
  instance: ComponentInternalInstance
}

/** Performance timing types emitted by Vue */
export type PerfType = 'init' | 'render' | 'patch' | 'mount' | 'renderEffect'

export interface PerfPayload {
  app: App
  uid: number
  instance: ComponentInternalInstance
  type: PerfType
  time: number
}

export interface InstrumentationOptions {
  onComponentUpdate?: (payload: ComponentUpdatePayload) => void
  onComponentAdd?: (payload: ComponentUpdatePayload) => void
  onComponentRemove?: (payload: ComponentUpdatePayload) => void
  onPerfStart?: (payload: PerfPayload) => void
  onPerfEnd?: (payload: PerfPayload) => void
}

// ============================================================================
// Global hook access
// ============================================================================

declare global {
  interface Window {
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: DevToolsHook
  }
}

/**
 * Creates a minimal DevTools hook that Vue will use to emit events.
 * This is similar to what Vue DevTools extension does.
 */
function createDevToolsHook(): DevToolsHook {
  return {
    id: 'vue-scan',
    enabled: true,
    appRecords: [],
    apps: {},
    events: new Map(),
    on(event, fn) {
      if (!this.events.has(event)) {
        this.events.set(event, [])
      }
      this.events.get(event)!.push(fn)
      // Return cleanup function
      return () => this.off(event, fn)
    },
    once(event, fn) {
      const onceFn = (...args: unknown[]) => {
        this.off(event, onceFn)
        ;(fn as Function)(...args)
      }
      this.on(event, onceFn)
    },
    off(event, fn) {
      if (this.events.has(event)) {
        const callbacks = this.events.get(event)!
        const index = callbacks.indexOf(fn)
        if (index !== -1) {
          callbacks.splice(index, 1)
        }
      }
    },
    emit(event, ...payload) {
      if (this.events.has(event)) {
        this.events.get(event)!.forEach(fn => fn(...payload))
      }
    },
  }
}

/**
 * Get or create the global DevTools hook.
 * If no hook exists, we create one so Vue will use it when apps mount.
 */
function getOrCreateDevToolsHook(): DevToolsHook | null {
  if (typeof window === 'undefined') {
    return null
  }

  // If hook already exists (e.g., from Vue DevTools extension), use it
  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
    return window.__VUE_DEVTOOLS_GLOBAL_HOOK__
  }

  // Create our own hook - Vue will use this when it initializes
  const hook = createDevToolsHook()
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = hook
  return hook
}

// ============================================================================
// Instrumentation
// ============================================================================

export interface Instrumentation {
  /** Whether instrumentation is active */
  readonly isActive: boolean
  /** Stop listening to all events */
  stop: () => void
}

/**
 * Check if we're in a browser environment where instrumentation can work.
 */
export function isDevToolsAvailable(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Create instrumentation instance to listen for Vue component updates.
 * 
 * IMPORTANT: Call this BEFORE mounting your Vue app, so the hook is
 * available when Vue initializes.
 * 
 * @example
 * ```ts
 * import { createInstrumentation } from 'vue-scan'
 * import { createApp } from 'vue'
 * 
 * // Set up instrumentation first
 * const instrumentation = createInstrumentation({
 *   onComponentUpdate({ instance, uid }) {
 *     console.log('Component updated:', instance.type.__name ?? instance.type.name, uid)
 *   }
 * })
 * 
 * // Then mount your app
 * createApp(App).mount('#app')
 * 
 * // Later, to stop:
 * instrumentation.stop()
 * ```
 */
export function createInstrumentation(
  options: InstrumentationOptions
): Instrumentation {
  const hook = getOrCreateDevToolsHook()

  if (!hook) {
    console.warn(
      '[vue-scan] Not in a browser environment. Instrumentation disabled.'
    )
    return {
      isActive: false,
      stop: () => {},
    }
  }

  const cleanupFns: Array<() => void> = []

  function registerComponentHandler(
    event: DevToolsHooks,
    callback: ((payload: ComponentUpdatePayload) => void) | undefined
  ): void {
    if (!callback) return

    const handler = (
      app: App,
      uid: number,
      parentUid: number | undefined,
      instance: ComponentInternalInstance
    ): void => {
      callback({ app, uid, parentUid, instance })
    }

    const cleanup = hook!.on(event, handler)
    cleanupFns.push(cleanup)
  }

  function registerPerfHandler(
    event: DevToolsHooks,
    callback: ((payload: PerfPayload) => void) | undefined
  ): void {
    if (!callback) return

    // Vue emits: (app, uid, instance, type, time)
    const handler = (
      app: App,
      uid: number,
      instance: ComponentInternalInstance,
      type: PerfType,
      time: number
    ): void => {
      callback({ app, uid, instance, type, time })
    }

    const cleanup = hook!.on(event, handler)
    cleanupFns.push(cleanup)
  }

  // Register handlers for each event type
  registerComponentHandler(DevToolsHooks.COMPONENT_UPDATED, options.onComponentUpdate)
  registerComponentHandler(DevToolsHooks.COMPONENT_ADDED, options.onComponentAdd)
  registerComponentHandler(DevToolsHooks.COMPONENT_REMOVED, options.onComponentRemove)
  registerPerfHandler(DevToolsHooks.PERFORMANCE_START, options.onPerfStart)
  registerPerfHandler(DevToolsHooks.PERFORMANCE_END, options.onPerfEnd)

  return {
    isActive: true,
    stop() {
      for (const cleanup of cleanupFns) {
        cleanup()
      }
      cleanupFns.length = 0
    },
  }
}
