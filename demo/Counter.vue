<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  <div style="margin-top: 12px;">
    <button @click="count--">-</button>
    <span style="margin: 0 12px;">Count: {{ count }}</span>
    <button @click="count++">+</button>
  </div>
</template>
