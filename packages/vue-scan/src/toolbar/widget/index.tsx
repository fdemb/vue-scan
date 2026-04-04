/** @jsxImportSource preact */
import { Toolbar } from '../views/toolbar'

export function Widget() {
  return (
    <div class="fixed bottom-3 right-3 z-2147483647 flex flex-col items-end text-white select-none">
      <Toolbar />
    </div>
  )
}
