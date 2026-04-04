/** @jsxImportSource preact */
import { useState } from 'preact/hooks'
import {
  componentDataRevision,
  treeRevision,
  selectedComponentUid,
  getComponentTree,
  getSelectedComponent,
  getComponentPath,
  selectComponent,
  clearSelection,
  type ComponentTreeNode,
  type ComponentUpdate,
  type PropChange,
} from '../../../component-data'

export function ComponentPanel() {
  // Subscribe to revisions to re-render when tree or selected component updates
  void treeRevision.value
  void componentDataRevision.value
  const selectedUid = selectedComponentUid.value

  const tree = getComponentTree()
  const selectedNode = getSelectedComponent()

  const handleSelect = (uid: number) => {
    if (uid === selectedUid) {
      // Clicking same component clears selection
      clearSelection()
    } else {
      selectComponent(uid)
    }
  }

  return (
    <div class="flex h-[360px]">
      {/* Left: component tree */}
      <div class="w-[200px] border-r border-white/[0.06] overflow-y-auto shrink-0">
        <div class="px-2 py-1.5 text-[10px] text-neutral-500 uppercase tracking-wider">
          Component Tree
        </div>
        {tree.length === 0 ? (
          <div class="flex items-center justify-center text-neutral-500 text-xs py-8">
            No components mounted
          </div>
        ) : (
          <div class="flex flex-col px-1 pb-2">
            {tree.map((node) => (
              <TreeNode
                key={node.uid}
                node={node}
                selectedUid={selectedUid}
                onSelect={handleSelect}
                depth={0}
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
          <EmptyState />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Left panel — tree node
// ============================================================================

function TreeNode({
  node,
  selectedUid,
  onSelect,
  depth,
}: {
  node: ComponentTreeNode
  selectedUid: number | null
  onSelect: (uid: number) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(depth < 2) // Auto-expand first 2 levels
  const isSelected = node.uid === selectedUid
  const hasChildren = node.hasChildren

  return (
    <div>
      <button
        onClick={() => onSelect(node.uid)}
        class={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer ${
          isSelected ? 'bg-vue-green/20 text-vue-green' : 'hover:bg-white/5'
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            class="w-4 h-4 flex items-center justify-center hover:bg-white/10 rounded shrink-0"
          >
            <svg
              class={`w-3 h-3 text-neutral-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span class="w-4 shrink-0" />
        )}
        
        <span class={`truncate ${isSelected ? 'text-vue-green' : 'text-neutral-300'}`}>
          {node.name}
        </span>
      </button>
      
      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.uid}
              node={child}
              selectedUid={selectedUid}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState() {
  return (
    <div class="flex flex-col items-center justify-center h-full text-center px-6">
      <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      </div>
      <div class="text-sm text-neutral-400 mb-1">Select a component</div>
      <div class="text-xs text-neutral-600 max-w-[200px]">
        Choose a component from the tree to start tracking its state changes
      </div>
    </div>
  )
}

// ============================================================================
// Right panel — detail view
// ============================================================================

function DetailView({ node }: { node: { uid: number; name: string; updates: ComponentUpdate[]; totalUpdates: number } }) {
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
          {node.totalUpdates === 0 ? (
            <span class="text-neutral-600">Waiting for updates...</span>
          ) : (
            <span>{node.totalUpdates} update{node.totalUpdates !== 1 ? 's' : ''} since selection</span>
          )}
        </div>
      </div>

      {/* Update history */}
      <div class="flex-1 overflow-y-auto">
        {node.updates.length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-center px-4">
            <div class="text-xs text-neutral-600">
              No state changes detected yet.
              <br />
              Interact with this component to see updates.
            </div>
          </div>
        ) : (
          [...node.updates].reverse().map((update: ComponentUpdate, i: number) => (
            <UpdateEntry key={i} update={update} index={node.totalUpdates - i} />
          ))
        )}
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
