<template>
  <div class="space-y-6">
    <!-- Add Todo Form -->
    <div class="bg-card rounded-lg border p-6">
      <form @submit.prevent="handleAddTodo" class="flex gap-2">
        <input
          v-model="newTodoTitle"
          type="text"
          placeholder="Add a new todo..."
          class="flex-1 px-3 py-2 bg-background border border-input rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          :disabled="loading"
        />
        <button
          type="submit"
          :disabled="!newTodoTitle.trim() || loading"
          class="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Plus class="w-4 h-4" />
          Add Todo
        </button>
      </form>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="bg-destructive/15 border border-destructive/20 text-destructive rounded-lg p-4">
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="loading && todos.length === 0" class="text-center py-12">
      <div class="text-muted-foreground">Loading todos...</div>
    </div>

    <!-- Todo Stats -->
    <div v-if="todos.length > 0" class="flex items-center justify-between text-sm text-muted-foreground">
      <span>{{ totalCount }} {{ totalCount === 1 ? 'todo' : 'todos' }} total</span>
      <span>{{ completedCount }} completed</span>
    </div>

    <!-- Filter Tabs -->
    <div v-if="todos.length > 0" class="flex gap-1 bg-muted rounded-lg p-1">
      <button
        v-for="filter in filters"
        :key="filter.key"
        @click="currentFilter = filter.key"
        :class="[
          'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          currentFilter === filter.key
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        ]"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Todo List -->
    <div v-if="filteredTodos.length > 0" class="space-y-2">
      <TodoItem
        v-for="todo in filteredTodos"
        :key="todo.id"
        :todo="todo"
        @toggle="handleToggleTodo"
        @delete="handleDeleteTodo"
      />
    </div>

    <!-- Empty State -->
    <div v-else-if="!loading" class="text-center py-12">
      <div class="text-muted-foreground">
        <div v-if="todos.length === 0" class="space-y-2">
          <div class="text-lg font-medium">No todos yet</div>
          <div class="text-sm">Add your first todo above to get started!</div>
        </div>
        <div v-else>
          <div class="text-lg font-medium">No todos match current filter</div>
          <div class="text-sm">Try switching to a different filter</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus } from 'lucide-vue-next'
import { useTodosStore } from '@/stores/todos/useTodosStore'
import TodoItem from '@/components/blocks/TodoItem.vue'

// Store
const todosStore = useTodosStore()
const { todos, loading, error, completedCount, totalCount } = storeToRefs(todosStore)

// Local state
const newTodoTitle = ref('')
const currentFilter = ref<'all' | 'active' | 'completed'>('all')

// Filter options
const filters = [
  { key: 'all' as const, label: 'All' },
  { key: 'active' as const, label: 'Active' },
  { key: 'completed' as const, label: 'Completed' }
]

// Computed
const filteredTodos = computed(() => {
  switch (currentFilter.value) {
    case 'active':
      return todos.value.filter(todo => !todo.completed)
    case 'completed':
      return todos.value.filter(todo => todo.completed)
    default:
      return todos.value
  }
})

// Methods
const handleAddTodo = async () => {
  if (!newTodoTitle.value.trim()) return
  
  await todosStore.addTodo(newTodoTitle.value.trim())
  newTodoTitle.value = ''
}

const handleToggleTodo = async (id: string) => {
  await todosStore.toggleTodo(id)
}

const handleDeleteTodo = async (id: string) => {
  await todosStore.deleteTodo(id)
}

// Lifecycle
onMounted(() => {
  todosStore.fetchTodos()
})
</script>
