<script setup lang="ts">
import { ref } from 'vue'

const todos = ref<string[]>(['Learn Vue', 'Build something'])
const newTodo = ref('')

function addTodo() {
  if (newTodo.value.trim()) {
    todos.value.push(newTodo.value.trim())
    newTodo.value = ''
  }
}

function removeTodo(index: number) {
  todos.value.splice(index, 1)
}
</script>

<template>
  <div>
    <div style="margin-bottom: 12px;">
      <input 
        v-model="newTodo" 
        @keyup.enter="addTodo"
        placeholder="Add a todo..."
      />
      <button @click="addTodo">Add</button>
    </div>
    <ul>
      <li v-for="(todo, index) in todos" :key="index">
        {{ todo }}
        <button @click="removeTodo(index)" style="margin-left: 8px;">×</button>
      </li>
    </ul>
  </div>
</template>
