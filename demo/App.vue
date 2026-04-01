<script setup lang="ts">
import { ref } from 'vue'
import Counter from './Counter.vue'
import TodoList from './TodoList.vue'

const showCounter = ref(true)
</script>

<template>
  <h1>Vue Toolkit Demo</h1>
  <p>Open the browser console to see component tracking logs.</p>

  <div class="card">
    <h2>Mount/Unmount Test</h2>
    <button @click="showCounter = !showCounter">
      {{ showCounter ? 'Hide' : 'Show' }} Counter
    </button>
    <Counter v-if="showCounter" />
  </div>

  <div class="card">
    <h2>Update Test</h2>
    <TodoList />
  </div>
</template>
