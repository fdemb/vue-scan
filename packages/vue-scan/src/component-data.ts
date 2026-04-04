/**
 * Tracks per-component "what changed" data and component hierarchy.
 * Consumed by the toolbar UI via signals.
 */

import { signal } from '@preact/signals'

// ============================================================================
// Types
// ============================================================================

export interface PropChange {
  key: string
  prev: unknown
  next: unknown
}

export interface ComponentUpdate {
  timestamp: number
  changes: {
    props: PropChange[]
    state: PropChange[]
  }
}

export interface ComponentNode {
  uid: number
  name: string
  parentUid: number | undefined
  /** Most recent updates (capped to keep memory bounded) */
  updates: ComponentUpdate[]
  /** Total number of updates since mount */
  totalUpdates: number
}

// ============================================================================
// Store
// ============================================================================

const MAX_UPDATES_PER_COMPONENT = 20

/** All tracked components, keyed by uid */
const componentMap = new Map<number, ComponentNode>()

/** Last-known snapshot of each component's props & state, keyed by uid.
 *  Captured on mount and updated after every successful diff. */
const lastSnapshots = new Map<number, {
  props: Record<string, unknown>
  state: Record<string, unknown>
}>()

/** Monotonically increasing revision counter — bumped on every mutation so
 *  Preact signals can react. */
export const componentDataRevision = signal(0)

function notify() {
  componentDataRevision.value++
}

// ============================================================================
// Value helpers
// ============================================================================

/** Check if a value is a Vue ref (has __v_isRef flag) */
function isRef(value: unknown): value is { __v_isRef: true; value: unknown } {
  return value !== null && typeof value === 'object' && (value as any).__v_isRef === true
}

/** Unwrap a value — if it's a ref, read .value; otherwise return as-is */
function unwrapValue(value: unknown): unknown {
  return isRef(value) ? value.value : value
}

/** Shallow-clone props (plain values, no refs) */
function shallowClone(obj: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!obj) return {}
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    out[key] = obj[key]
  }
  return out
}

/** Snapshot state from devtoolsRawSetupState — unwraps refs/reactive to
 *  capture their current primitive values. Skips internal Vue keys and
 *  non-state entries (functions, components, directives). */
function snapshotRawState(rawSetupState: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!rawSetupState) return {}
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(rawSetupState)) {
    if (key.startsWith('$') || key.startsWith('_')) continue
    const raw = rawSetupState[key]
    // Skip functions (methods, event handlers) — they don't represent reactive state
    if (typeof raw === 'function') continue
    // Skip components/directives (objects with render or setup)
    if (raw !== null && typeof raw === 'object' && !isRef(raw) && !(raw as any).__v_isReactive) {
      if ('render' in (raw as any) || 'setup' in (raw as any) || '__asyncLoader' in (raw as any)) continue
    }
    out[key] = unwrapValue(raw)
  }
  return out
}

// ============================================================================
// Public API
// ============================================================================

/** Register a new component and capture its initial state.
 *  Call on component:added. */
export function trackComponentAdd(
  uid: number,
  name: string,
  parentUid: number | undefined,
  props: Record<string, unknown> | null | undefined,
  rawSetupState: Record<string, unknown> | null | undefined,
) {
  componentMap.set(uid, {
    uid,
    name,
    parentUid,
    updates: [],
    totalUpdates: 0,
  })
  // Capture initial state so the first update can diff against it
  lastSnapshots.set(uid, {
    props: shallowClone(props),
    state: snapshotRawState(rawSetupState),
  })
  notify()
}

/** Remove a component from tracking. Call on component:removed. */
export function trackComponentRemove(uid: number) {
  componentMap.delete(uid)
  lastSnapshots.delete(uid)
  notify()
}

/** Diff current props/state against last-known snapshot, record changes,
 *  then update the snapshot. Call on component:updated. */
export function trackComponentUpdate(
  uid: number,
  name: string,
  parentUid: number | undefined,
  currentProps: Record<string, unknown> | null | undefined,
  rawSetupState: Record<string, unknown> | null | undefined,
) {
  const propChanges: PropChange[] = []
  const stateChanges: PropChange[] = []

  const prev = lastSnapshots.get(uid)
  const nextProps = shallowClone(currentProps)
  const nextState = snapshotRawState(rawSetupState)

  if (prev) {
    // Diff props
    for (const key of new Set([...Object.keys(prev.props), ...Object.keys(nextProps)])) {
      if (!Object.is(prev.props[key], nextProps[key])) {
        propChanges.push({ key, prev: prev.props[key], next: nextProps[key] })
      }
    }

    // Diff state
    for (const key of new Set([...Object.keys(prev.state), ...Object.keys(nextState)])) {
      if (!Object.is(prev.state[key], nextState[key])) {
        stateChanges.push({ key, prev: prev.state[key], next: nextState[key] })
      }
    }
  }

  // Update snapshot to current values
  lastSnapshots.set(uid, { props: nextProps, state: nextState })

  let node = componentMap.get(uid)
  if (!node) {
    node = { uid, name, parentUid, updates: [], totalUpdates: 0 }
    componentMap.set(uid, node)
  }

  node.totalUpdates++
  node.updates.push({
    timestamp: Date.now(),
    changes: { props: propChanges, state: stateChanges },
  })

  // Cap stored updates
  if (node.updates.length > MAX_UPDATES_PER_COMPONENT) {
    node.updates = node.updates.slice(-MAX_UPDATES_PER_COMPONENT)
  }

  notify()
}

/** Get a read-only snapshot of all component nodes. */
export function getComponentNodes(): ComponentNode[] {
  return Array.from(componentMap.values())
}

/** Build the component path (hierarchy) for a given uid, from leaf to root. */
export function getComponentPath(uid: number): string[] {
  const path: string[] = []
  let current = componentMap.get(uid)
  const seen = new Set<number>()

  while (current && !seen.has(current.uid)) {
    seen.add(current.uid)
    path.push(current.name)
    if (current.parentUid === undefined) break
    current = componentMap.get(current.parentUid)
  }

  return path
}

/** Clear all tracked data. */
export function clearComponentData() {
  componentMap.clear()
  lastSnapshots.clear()
  notify()
}
