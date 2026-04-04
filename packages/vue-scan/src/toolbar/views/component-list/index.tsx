/** @jsxImportSource preact */
import { useMemo, useState } from 'preact/hooks'
import {
  componentDataRevision,
  getComponentNodes,
  getComponentPath,
  type ComponentNode,
  type ComponentUpdate,
  type PropChange,
} from '../../../component-data'

export function ComponentPanel() {
  const _rev = componentDataRevision.value
  const [selectedUid, setSelectedUid] = useState<number | null>(null)

  const nodes = getComponentNodes()

  const updated = useMemo(
    () =>
      nodes
        .filter((n) => n.totalUpdates > 0)
        .sort((a, b) => {
          const aLast = a.updates.at(-1)?.timestamp ?? 0
          const bLast = b.updates.at(-1)?.timestamp ?? 0
          return bLast - aLast
        }),
    [_rev],
  )

  const selectedNode = updated.find((n) => n.uid === selectedUid) ?? null

  // Auto-select first if nothing selected
  if (!selectedNode && updated.length > 0 && selectedUid === null) {
    setSelectedUid(updated[0].uid)
  }

  return (
    <div class="flex h-[360px]">
      {/* Left: component list */}
      <div class="w-[200px] border-r border-white/[0.06] overflow-y-auto shrink-0">
        <div class="px-2 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider">
          Components
        </div>
        {updated.length === 0 ? (
          <div class="flex items-center justify-center text-neutral-500 text-xs py-8">
            No updates yet
          </div>
        ) : (
          <div class="flex flex-col gap-px px-1">
            {updated.map((node) => (
              <ComponentListItem
                key={node.uid}
                node={node}
                selected={node.uid === selectedUid}
                onSelect={() => setSelectedUid(node.uid)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: detail view */}
      <div class="flex-1 overflow-y-auto min-w-0">
        {selectedNode ? (
          <DetailView node={selectedNode} />
        ) : (
          <div class="flex items-center justify-center h-full text-neutral-500 text-xs">
            Select a component
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Left panel — component list item
// ============================================================================

function ComponentListItem({
  node,
  selected,
  onSelect,
}: {
  node: ComponentNode
  selected: boolean
  onSelect: () => void
}) {
  const lastUpdate = node.updates.at(-1)
  const changeCount = lastUpdate
    ? lastUpdate.changes.props.length + lastUpdate.changes.state.length
    : 0

  return (
    <button
      onClick={onSelect}
      class={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${selected ? 'bg-white/10' : 'hover:bg-white/5'}`}
    >
      <div class="flex-1 min-w-0 flex items-center gap-1.5">
        <span class="text-vue-green font-medium truncate">{node.name}</span>
        <span class="text-neutral-600 text-[10px] shrink-0">×{node.totalUpdates}</span>
      </div>
      {changeCount > 0 && (
        <span class="text-[10px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded shrink-0">
          {changeCount}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Right panel — detail view
// ============================================================================

function DetailView({ node }: { node: ComponentNode }) {
  const path = getComponentPath(node.uid)

  return (
    <div class="flex flex-col h-full">
      {/* Header */}
      <div class="px-3 py-2 border-b border-white/[0.06]">
        <div class="text-sm font-medium text-vue-green">{node.name}</div>
        {path.length > 1 && (
          <div class="flex items-center gap-0.5 mt-0.5">
            {path.map((name, i) => (
              <span key={i} class="flex items-center gap-0.5">
                <span class={`text-[10px] whitespace-nowrap ${i === 0 ? 'text-neutral-300' : 'text-neutral-600'}`}>
                  {name}
                </span>
                {i < path.length - 1 && <span class="text-neutral-700 text-[10px]">‹</span>}
              </span>
            ))}
          </div>
        )}
        <div class="text-[10px] text-neutral-500 mt-1">
          {node.totalUpdates} update{node.totalUpdates !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Update history */}
      <div class="flex-1 overflow-y-auto">
        {[...node.updates].reverse().map((update: ComponentUpdate, i: number) => (
          <UpdateEntry key={i} update={update} index={node.totalUpdates - i} />
        ))}
      </div>
    </div>
  )
}

function UpdateEntry({ update, index }: { update: ComponentUpdate; index: number }) {
  const { props, state } = update.changes
  const hasChanges = props.length > 0 || state.length > 0
  const ago = formatTimeAgo(update.timestamp)

  return (
    <div class="px-3 py-2 border-b border-white/[0.04]">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] text-neutral-500">#{index}</span>
        <span class="text-[10px] text-neutral-600">{ago}</span>
      </div>

      {!hasChanges ? (
        <div class="text-[10px] text-neutral-600 italic">Re-render (no detected changes)</div>
      ) : (
        <div class="flex flex-col gap-1.5">
          {props.length > 0 && (
            <ChangeSection label="Props" changes={props} color="blue" />
          )}
          {state.length > 0 && (
            <ChangeSection label="State" changes={state} color="purple" />
          )}
        </div>
      )}
    </div>
  )
}

function ChangeSection({
  label,
  changes,
  color,
}: {
  label: string
  changes: PropChange[]
  color: 'blue' | 'purple'
}) {
  const labelClass = color === 'blue' ? 'text-blue-400' : 'text-purple-400'
  const bgClass = color === 'blue' ? 'bg-blue-500/10' : 'bg-purple-500/10'

  return (
    <div>
      <div class={`text-[10px] font-medium ${labelClass} mb-0.5`}>{label}</div>
      <div class="flex flex-col gap-0.5">
        {changes.map((change) => (
          <div key={change.key} class={`${bgClass} rounded px-1.5 py-1 font-mono text-[10px]`}>
            <span class={labelClass}>{change.key}</span>
            <div class="flex flex-col gap-0.5 mt-0.5">
              <div class="flex items-start gap-1">
                <span class="text-red-400/70 shrink-0">-</span>
                <span class="text-red-400/70 break-all">{formatValue(change.prev)}</span>
              </div>
              <div class="flex items-start gap-1">
                <span class="text-green-400/70 shrink-0">+</span>
                <span class="text-green-400/70 break-all">{formatValue(change.next)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'string') return `"${value.length > 80 ? value.slice(0, 80) + '…' : value}"`
  if (typeof value === 'function') return `ƒ ${value.name || 'anonymous'}()`
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value)
      return str.length > 100 ? str.slice(0, 100) + '…' : str
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 2) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ago`
}
