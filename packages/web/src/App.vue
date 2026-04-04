<script setup lang="ts">
import InstallCard from "./components/InstallCard.vue";
import { exampleViteConfigCode } from "./lib/code";
</script>

<template>
  <div
    class="flex flex-col mx-auto max-w-[800px] py-24 px-6 sm:px-8 gap-4 text-lg text-neutral-100 text-pretty leading-relaxed"
  >
    <p>
      <strong class="font-bold">Vue Scan</strong> is a port of
      <a
        class="underline underline-offset-2"
        href="https://react-scan.com"
        target="_blank"
        rel="noopener noreferrer"
        >React Scan</a
      >
      for Vue. It helps you identify performance issues in your Vue app.
    </p>

    <p class="text-neutral-300">
      It works by hooking into Vue's DevTools instrumentation to highlight every
      component render in real time, so you can spot the hot paths and fix them
      before they become a problem.
    </p>

    <p class="text-neutral-300">
      Existing Vue tooling lacked this kind of utility, so I decided to build my
      own. Like the React original, it's incredibly easy to use.
    </p>

    <InstallCard />

    <p class="text-neutral-300">
      By default, Vue Scan only works in development mode. Vue disables DevTools
      instrumentation in production builds by default — and Vue Scan relies on
      it. To enable it in production, set
      <code class="text-green-200 text-sm">__VUE_PROD_DEVTOOLS__</code> to
      <code class="text-green-200 text-sm">true</code> in your bundler config.
    </p>

    <p class="text-neutral-300">Here is an example for Vite:</p>

    <div
      class="bg-neutral-950 border border-neutral-800 rounded-lg p-4 [&_pre]:text-sm [&_pre]:bg-transparent!"
    >
      <div v-html="exampleViteConfigCode" />
    </div>
  </div>
</template>
