import { startTracking } from './main'

if (typeof window !== 'undefined') {
  if (document.body) {
    startTracking()
  } else {
    document.addEventListener('DOMContentLoaded', () => startTracking())
  }
}
