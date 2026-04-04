/** @jsxImportSource preact */
import { Toolbar } from '../views/toolbar'

export function Widget() {
  return (
    <div class="fixed bottom-3 right-3 z-2147483647 flex items-center gap-1.5 bg-[#141414] border border-white/10 rounded-lg px-2 py-1 text-white select-none shadow-lg">
      <Toolbar />
    </div>
  )
}
