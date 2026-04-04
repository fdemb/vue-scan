<script setup lang="ts">
defineOptions({
  name: "Header",
});
</script>

<template>
  <header class="flex items-center justify-between">
    <div class="text-xs font-bold uppercase tracking-wider text-green-200">
      Vue Scan
    </div>

    <div class="flex items-center gap-2">
      <a
        href="https://github.com/fdemb/vue-scan"
        target="_blank"
        rel="noopener noreferrer"
        class="text-sm underline underline-offset-2"
      >
        GitHub
      </a>
    </div>
  </header>
</template>
