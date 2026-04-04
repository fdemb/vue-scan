// Vue Toolkit - Performance tracking for Vue applications
// Requires __VUE_PROD_DEVTOOLS__: true in the app's bundler config (for production builds)

export { 
  createInstrumentation,
  isDevToolsAvailable,
  type Instrumentation,
  type InstrumentationOptions,
  type ComponentUpdatePayload,
  type PerfPayload,
  type PerfType,
  type DevToolsHook,
  DevToolsHooks,
} from './instrumentation'

export {
  initOverlay,
  cleanup as cleanupOverlay,
  isOverlayActive,
} from './overlay'

import { createInstrumentation, isDevToolsAvailable, type PerfType } from './instrumentation'
import { initOverlay, outlineComponent } from './overlay'
import { createToolbar } from './toolbar'

export const VERSION = '0.0.1'

// ============================================================================
// Performance timing tracking
// ============================================================================

/** Key for tracking in-flight perf measurements: "uid:type" */
type PerfKey = `${number}:${PerfType}`

/** Stores start times for in-flight performance measurements */
const perfStartTimes = new Map<PerfKey, number>()

/** Aggregated performance data per component */
export interface ComponentPerfData {
  /** Component name */
  name: string
  /** Init time (ms) - component instance creation */
  initTime: number
  /** Total render time (ms) */
  renderTime: number
  /** Number of renders */
  renderCount: number
  /** Total patch time (ms) */
  patchTime: number
  /** Number of patches */
  patchCount: number
  /** Total mount time (ms) */
  mountTime: number
  /** Last update timestamp */
  lastUpdate: number
}

/** Performance data keyed by component uid */
const componentPerfData = new Map<number, ComponentPerfData>()

/** Get aggregated performance data for all tracked components */
export function getPerfData(): Map<number, ComponentPerfData> {
  return new Map(componentPerfData)
}

/** Clear all performance data */
export function clearPerfData(): void {
  componentPerfData.clear()
  perfStartTimes.clear()
}

// ============================================================================
// Main tracking API
// ============================================================================

/**
 * Start tracking Vue component updates and performance.
 * 
 * IMPORTANT: Call this BEFORE creating/mounting your Vue app.
 * 
 * @example
 * ```ts
 * import { startTracking } from 'vue-scan'
 * import { createApp } from 'vue'
 * 
 * startTracking()  // Must be called first!
 * createApp(App).mount('#app')
 * ```
 */
export function startTracking(options: { overlay?: boolean; logToConsole?: boolean } = {}) {
  const { overlay = true, logToConsole = false } = options

  if (!isDevToolsAvailable()) {
    console.warn('[vue-scan] Not in a browser environment.')
    return null
  }

  if (logToConsole) console.log('[vue-scan] Starting component tracking...')

  // Initialize overlay if enabled
  if (overlay) {
    initOverlay()
    createToolbar()
  }

  const instrumentation = createInstrumentation({
    onComponentAdd({ instance, uid }) {
      const name = getComponentName(instance)
      if (logToConsole) console.log(`[vue-scan] + MOUNT: ${name} (uid: ${uid})`)
      
      // Add outline for mount
      if (overlay) {
        outlineComponent(uid, name, instance)
      }
    },

    onComponentUpdate({ instance, uid }) {
      const name = getComponentName(instance)
      if (logToConsole) console.log(`[vue-scan] ↻ UPDATE: ${name} (uid: ${uid})`)
      
      // Add outline for update
      if (overlay) {
        outlineComponent(uid, name, instance)
      }
    },

    onComponentRemove({ instance, uid }) {
      const name = getComponentName(instance)
      if (logToConsole) console.log(`[vue-scan] - UNMOUNT: ${name} (uid: ${uid})`)
      // Clean up perf data for unmounted components
      componentPerfData.delete(uid)
    },

    onPerfStart({ uid, instance, type, time }) {
      const key: PerfKey = `${uid}:${type}`
      perfStartTimes.set(key, time)
      
      // Initialize component perf data if needed
      if (!componentPerfData.has(uid)) {
        componentPerfData.set(uid, {
          name: getComponentName(instance),
          initTime: 0,
          renderTime: 0,
          renderCount: 0,
          patchTime: 0,
          patchCount: 0,
          mountTime: 0,
          lastUpdate: Date.now(),
        })
      }
    },

    onPerfEnd({ uid, instance, type, time }) {
      const key: PerfKey = `${uid}:${type}`
      const startTime = perfStartTimes.get(key)
      
      if (startTime === undefined) {
        // No matching start event - shouldn't happen but be defensive
        return
      }
      
      perfStartTimes.delete(key)
      const duration = time - startTime
      const name = getComponentName(instance)
      
      // Update aggregated data
      const data = componentPerfData.get(uid)
      if (data) {
        data.lastUpdate = Date.now()
        
        switch (type) {
          case 'init':
            data.initTime += duration
            break
          case 'render':
          case 'renderEffect':
            data.renderTime += duration
            data.renderCount++
            break
          case 'patch':
            data.patchTime += duration
            data.patchCount++
            break
          case 'mount':
            data.mountTime += duration
            break
        }
      }
      
      // Log with appropriate formatting
      const durationStr = duration.toFixed(2)
      if (logToConsole) console.log(`[vue-scan] ⏱ PERF ${type}: ${name} (uid: ${uid}) - ${durationStr}ms`)
    },
  })

  if (logToConsole) console.log('[vue-scan] Tracking active. Waiting for Vue app to mount...')

  return instrumentation
}

/**
 * Get a human-readable name for a component instance
 */
function getComponentName(instance: { type: { __name?: string; name?: string } }): string {
  return instance.type.__name ?? instance.type.name ?? 'Anonymous'
}
