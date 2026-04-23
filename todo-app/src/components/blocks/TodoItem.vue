<template>
  <div class="flex items-center gap-3 bg-card border rounded-lg p-4 hover:bg-accent/5 transition-colors">
    <!-- Checkbox -->
    <button
      @click="$emit('toggle', todo.id)"
      :class="[
        'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
        todo.completed
          ? 'bg-primary border-primary text-primary-foreground'
          : 'border-border hover:border-primary'
      ]"
    >
      <Check v-if="todo.completed" class="w-3 h-3" />
    </button>

    <!-- Todo Text -->
    <div class="flex-1 min-w-0">
      <p :class="[
        'text-sm font-medium transition-colors',
        todo.completed
          ? 'text-muted-foreground line-through'
          : 'text-foreground'
      ]">
        {{ todo.title }}
      </p>
      <p class="text-xs text-muted-foreground">
        {{ formatDate(todo.createdAt) }}
      </p>
    </div>

    <!-- Delete Button -->
    <button
      @click="$emit('delete', todo.id)"
      class="flex-shrink-0 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
    >
      <Trash2 class="w-4 h-4" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Check, Trash2 } from 'lucide-vue-next'
import type { Todo } from '../../stores/todos/types'

interface Props {
  todo: Todo
}

interface Emits {
  toggle: [id: string]
  delete: [id: string]
}

defineProps<Props>()
defineEmits<Emits>()

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    if (diffInHours < 1) {
      return 'Just now'
    }
    return `${Math.floor(diffInHours)}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays === 1) {
    return 'Yesterday'
  }
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  return date.toLocaleDateString()
}
</script>
