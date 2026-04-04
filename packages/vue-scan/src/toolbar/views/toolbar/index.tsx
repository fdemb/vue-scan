/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks'
import { isPaused } from '../../state'
import { getFPS } from '../../../fps'
import { Switch } from '../../components/switch'

export function Toolbar() {
  return (
    <div class="flex items-center gap-2">
      <Switch checked={!isPaused.value} onChange={() => isPaused.value = !isPaused.value} title={isPaused.value ? 'Resume highlighting' : 'Pause highlighting'} />
      <Separator />
      <FpsMeter />
    </div>
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
