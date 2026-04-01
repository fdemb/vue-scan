/// <reference types="vite/client" />

// Vite ?raw import for inlining file content
declare module '*?raw' {
  const content: string
  export default content
}

// Vite ?worker&inline import for inlined web workers
declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker
  }
  export default workerConstructor
}
