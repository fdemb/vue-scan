# ⚡ Vue Scan

Vue Scan automatically detects performance issues in your Vue app.

- Requires minimal code changes — just drop it in
- Highlights exactly the components that re-render
- Tracks mount, render, and patch timing per component
- Always accessible through an in-page toolbar

### Quick Start

```js
import 'vue-scan/auto'
```

That's it. Open your app and the overlay + toolbar will appear automatically.

## Install

```bash
npm install vue-scan
```

> **Note:** Vue 3 is required as a peer dependency. For production builds, set `__VUE_PROD_DEVTOOLS__` to `true` in your bundler config.

### Vite

```ts
// vite.config.ts
export default defineConfig({
  define: {
    __VUE_PROD_DEVTOOLS__: true,
  },
})
```

### Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    define: {
      __VUE_PROD_DEVTOOLS__: true,
    },
  },
})
```

## Usage

### Auto Mode

Import anywhere in your app to start tracking immediately:

```js
import 'vue-scan/auto'
```

### Manual Mode

For more control over when and how tracking starts:

```js
import { startTracking } from 'vue-scan'

const instrumentation = startTracking({
  overlay: true,
  logToConsole: false,
})
```

## API Reference

<details>
<summary><code>startTracking(options?)</code></summary>

<br />

Starts tracking component lifecycle and performance events.

```ts
interface Options {
  /** Show the in-page visual overlay @default true */
  overlay?: boolean
  /** Log component events to console @default false */
  logToConsole?: boolean
}
```

Returns the `Instrumentation` instance, or `null` if not in a browser.

</details>

<details>
<summary><code>getPerfData()</code></summary>

<br />

Returns a `Map<number, ComponentPerfData>` snapshot of all tracked components:

```ts
interface ComponentPerfData {
  name: string
  initTime: number
  renderTime: number
  renderCount: number
  patchTime: number
  patchCount: number
  mountTime: number
  lastUpdate: number
}
```

</details>

<details>
<summary><code>clearPerfData()</code></summary>

<br />

Clears all collected performance data.

</details>

<details>
<summary><code>createInstrumentation(options)</code></summary>

<br />

Low-level API to hook into Vue's DevTools performance events directly:

```ts
createInstrumentation({
  onComponentAdd({ instance, uid }) {},
  onComponentUpdate({ instance, uid }) {},
  onComponentRemove({ instance, uid }) {},
  onPerfStart({ uid, instance, type, time }) {},
  onPerfEnd({ uid, instance, type, time }) {},
})
```

</details>

## Why Vue Scan?

Vue's reactivity system is powerful, but it can be hard to tell which components are re-rendering and why. Unnecessary renders silently degrade performance — especially in large apps with deep component trees.

Vue Scan makes this visible. It hooks into Vue's DevTools instrumentation to highlight every component render in real time, so you can spot the hot paths and fix them before they become a problem.

## Acknowledgments

- [React Scan](https://github.com/aidenybai/react-scan) for the concept and inspiration
- [Vue DevTools](https://devtools.vuejs.org/) for the instrumentation hooks that make this possible

## License

[MIT](LICENSE)
