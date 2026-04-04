<script setup lang="ts">
import { ref } from "vue";
import { exampleImportCode, exampleScriptTagCode } from "../lib/code";

const tab = ref<"script" | "npm" | "pnpm" | "yarn" | "bun">("script");
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="border border-neutral-800 rounded-lg overflow-hidden">
      <div class="flex bg-neutral-900 px-3 gap-4 border-b border-neutral-800">
        <button
          :data-active="tab === 'script'"
          class="text-base text-neutral-300 data-[active=true]:border-b data-[active=true]:border-green-300 flex flex-col hover:text-neutral-100 py-2 cursor-pointer data-[active=true]:text-neutral-100"
          @click="tab = 'script'"
        >
          Script tag
        </button>
        <button
          :data-active="tab === 'npm'"
          class="text-base text-neutral-300 data-[active=true]:border-b data-[active=true]:border-green-300 flex flex-col hover:text-neutral-100 py-2 cursor-pointer data-[active=true]:text-neutral-100"
          @click="tab = 'npm'"
        >
          npm
        </button>
        <button
          :data-active="tab === 'pnpm'"
          class="text-base text-neutral-300 data-[active=true]:border-b data-[active=true]:border-green-300 flex flex-col hover:text-neutral-100 py-2 cursor-pointer data-[active=true]:text-neutral-100"
          @click="tab = 'pnpm'"
        >
          pnpm
        </button>
        <button
          :data-active="tab === 'yarn'"
          class="text-base text-neutral-300 data-[active=true]:border-b data-[active=true]:border-green-300 flex flex-col hover:text-neutral-100 py-2 cursor-pointer data-[active=true]:text-neutral-100"
          @click="tab = 'yarn'"
        >
          yarn
        </button>
        <button
          :data-active="tab === 'bun'"
          class="text-base text-neutral-300 data-[active=true]:border-b data-[active=true]:border-green-300 flex flex-col hover:text-neutral-100 py-2 cursor-pointer data-[active=true]:text-neutral-100"
          @click="tab = 'bun'"
        >
          bun
        </button>
      </div>

      <div class="p-4">
        <div v-if="tab === 'script'" class="[&_pre]:text-sm [&_pre]:bg-transparent!" v-html="exampleScriptTagCode" />

        <div v-if="tab === 'npm'">
          <pre
            class="text-sm text-neutral-300"
          ><code>{{`npm install @fdemb1/vue-scan`}}</code></pre>
        </div>
        <div v-if="tab === 'pnpm'">
          <pre
            class="text-sm text-neutral-300"
          ><code>{{`pnpm add @fdemb1/vue-scan`}}</code></pre>
        </div>
        <div v-if="tab === 'yarn'">
          <pre
            class="text-sm text-neutral-300"
          ><code>{{`yarn add @fdemb1/vue-scan`}}</code></pre>
        </div>
        <div v-if="tab === 'bun'">
          <pre
            class="text-sm text-neutral-300"
          ><code>{{`bun add @fdemb1/vue-scan`}}</code></pre>
        </div>
      </div>
    </div>

    <div v-if="tab !== 'script'" class="flex flex-col gap-2">
      <p class="text-neutral-300">
        Then call the
        <code class="text-green-200 text-sm">startTracking</code> function
        before mounting your app:
      </p>

      <div class="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
        <div class="[&_pre]:text-sm [&_pre]:bg-transparent!" v-html="exampleImportCode" />
      </div>
    </div>
  </div>
</template>
