import { effect, signal } from '@preact/signals'

const STORAGE_KEY = 'vue-scan:paused'

export const isPaused = signal(localStorage.getItem(STORAGE_KEY) === 'true')

effect(() => {
  localStorage.setItem(STORAGE_KEY, String(isPaused.value))
})
