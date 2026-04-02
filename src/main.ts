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

type PerfKey = `${number}:${PerfType}`
const perfStartTimes = new Map<PerfKey, number>()

export interface ComponentPerfData {
  name: string
  initTime: number
  renderTime: number
  renderCount: number
  patchTime: number
  patchCount: number
  mountTime: number
  lastUpdate: number
}

const componentPerfData = new Map<number, ComponentPerfData>()

export function getPerfData(): Map<number, ComponentPerfData> {
  return new Map(componentPerfData)
}

export function clearPerfData(): void {
  componentPerfData.clear()
  perfStartTimes.clear()
}

export function startTracking(options: { overlay?: boolean; logToConsole?: boolean } = {}) {
  const { overlay = true, logToConsole = false } = options

  if (!isDevToolsAvailable()) {
    console.warn('[vue-scan] Not in a browser environment.')
    return null
  }

  if (logToConsole) console.log('[vue-scan] Starting component tracking...')

  if (overlay) {
    initOverlay()
    createToolbar()
  }

  const instrumentation = createInstrumentation({
    onComponentAdd({ instance, uid }) {
      const name = getComponentName(instance)
      if (logToConsole) console.log(`[vue-scan] + MOUNT: ${name} (uid: ${uid})`)
      
      if (overlay) {
        outlineComponent(uid, name, instance)
      }
    },

    onComponentUpdate({ instance, uid }) {
      const name = getComponentName(instance)
      if (logToConsole) console.log(`[vue-scan] ↻ UPDATE: ${name} (uid: ${uid})`)
      
      if (overlay) {
        outlineComponent(uid, name, instance)
      }
    },

    onComponentRemove({ instance, uid }) {
      const name = getComponentName(instance)
      if (logToConsole) console.log(`[vue-scan] - UNMOUNT: ${name} (uid: ${uid})`)
      componentPerfData.delete(uid)
    },

    onPerfStart({ uid, instance, type, time }) {
      const key: PerfKey = `${uid}:${type}`
      perfStartTimes.set(key, time)
      
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
        return
      }
      
      perfStartTimes.delete(key)
      const duration = time - startTime
      const name = getComponentName(instance)
      
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
      
      if (logToConsole) console.log(`[vue-scan] ⏱ PERF ${type}: ${name} (uid: ${uid}) - ${duration.toFixed(2)}ms`)
    },
  })

  if (logToConsole) console.log('[vue-scan] Tracking active. Waiting for Vue app to mount...')

  return instrumentation
}

function getComponentName(instance: { type: { __name?: string; name?: string } }): string {
  return instance.type.__name ?? instance.type.name ?? 'Anonymous'
}
