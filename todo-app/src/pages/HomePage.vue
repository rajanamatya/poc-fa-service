<template>
  <div class="min-h-screen bg-background">
    <div class="container mx-auto px-4 py-8">
      <div class="max-w-2xl mx-auto">
        <header class="text-center mb-8">
          <h1 class="text-4xl font-bold text-foreground mb-2">Todo App</h1>
          <p class="text-muted-foreground">Built with Vue 3, Pinia & Tailwind CSS</p>
        </header>

        <TodoApp />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TodoApp from '@/components/modules/TodoApp.vue'
</script>
