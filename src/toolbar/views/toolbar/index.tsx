/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks'
import { isPaused } from '../../state'
import { getFPS } from '../../../fps'

export function Toolbar() {
  return (
    <div class="flex items-center gap-1.5">
      <Toggle />
      <FpsMeter />
    </div>
  )
}

function Toggle() {
  const color = isPaused.value ? 'text-gray-400' : 'text-vue-green'
  return (
    <button
      type="button"
      title={isPaused.value ? 'Resume outlining' : 'Pause outlining'}
      onClick={() => { isPaused.value = !isPaused.value }}
      class={`cursor-pointer p-1 rounded hover:bg-white/10 transition-colors ${color}`}
    >
      {isPaused.value ? '⏸' : '▶'}
    </button>
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
    <span class={`min-w-[46px] text-right tabular-nums ${color}`}>
      {fps === null ? '--' : fps} FPS
    </span>
  )
}
