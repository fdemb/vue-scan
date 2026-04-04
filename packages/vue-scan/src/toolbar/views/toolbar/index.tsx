/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks'
import { isPaused } from '../../state'
import { getFPS } from '../../../fps'
import { Switch } from '../../components/switch'
import { ComponentPanel } from '../component-list'

export function Toolbar() {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div class="flex flex-col items-end gap-1.5">
      {panelOpen && (
        <div class="bg-[#141414] border border-white/10 rounded-lg shadow-lg w-[520px] overflow-hidden">
          <ComponentPanel />
        </div>
      )}
      <div class="flex items-center gap-2 bg-[#141414] border border-white/10 rounded-lg px-2 py-1 shadow-lg">
        <PanelToggle open={panelOpen} onToggle={() => setPanelOpen(!panelOpen)} />
        <Separator />
        <Switch checked={!isPaused.value} onChange={() => isPaused.value = !isPaused.value} title={isPaused.value ? 'Resume highlighting' : 'Pause highlighting'} />
        <Separator />
        <FpsMeter />
      </div>
    </div>
  )
}

function PanelToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      class="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 transition-colors cursor-pointer"
      title={open ? 'Hide component panel' : 'Show component panel'}
    >
      <svg
        class={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

function Separator() {
  return (
    <div class="w-px h-4 bg-neutral-800" />
  )
}

function FpsMeter() {
  const [fps, setFps] = useState<number | null>(null)

  useEffect(() => {
    const id = setInterval(() => setFps(getFPS()), 200)
    return () => clearInterval(id)
  }, [])

  const color = fps === null ? 'text-gray-400'
    : fps < 30 ? 'text-red-500'
      : fps < 50 ? 'text-amber-500'
        : 'text-vue-green'

  return (
    <div class="flex flex-row gap-1 items-center">
      <span class={`min-w-[3ch] bg-neutral-800 border border-white/10 rounded-md p-1 font-bold leading-none text-right text-sm tabular-nums font-mono ${color}`}>
        {fps === null ? '--' : fps}
      </span>
      <span class="text-neutral-400 text-xs">FPS</span>
    </div>
  )
}
