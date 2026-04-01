import { createApp } from 'vue'
import { startTracking } from '../src/main'
import App from './App.vue'

// Start tracking before mounting
startTracking()

createApp(App).mount('#app')
