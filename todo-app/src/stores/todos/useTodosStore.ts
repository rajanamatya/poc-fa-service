import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Todo } from './types'
import { todosService } from './todosService'

export const useTodosStore = defineStore('todos', () => {
  const todos = ref<Todo[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const completedTodos = computed(() => todos.value.filter(todo => todo.completed))
  const activeTodos = computed(() => todos.value.filter(todo => !todo.completed))
  const completedCount = computed(() => completedTodos.value.length)
  const totalCount = computed(() => todos.value.length)

  // Actions
  const clearError = () => {
    error.value = null
  }

  const setError = (message: string) => {
    error.value = message
    console.error('Todo Store Error:', message)
  }

  const fetchTodos = async () => {
    try {
      clearError()
      loading.value = true
      todos.value = await todosService.getTodos()
    } catch (err) {
      setError('Failed to fetch todos')
    } finally {
      loading.value = false
    }
  }

  const addTodo = async (title: string) => {
    try {
      clearError()
      loading.value = true
      const newTodo = await todosService.createTodo(title)
      todos.value.push(newTodo)
    } catch (err) {
      setError('Failed to add todo')
    } finally {
      loading.value = false
    }
  }

  const updateTodo = async (id: string, updates: Partial<Omit<Todo, 'id'>>) => {
    try {
      clearError()
      const updatedTodo = await todosService.updateTodo(id, updates)
      const index = todos.value.findIndex(t => t.id === id)
      if (index !== -1) {
        todos.value[index] = updatedTodo
      }
    } catch (err) {
      setError('Failed to update todo')
    }
  }

  const deleteTodo = async (id: string) => {
    try {
      clearError()
      await todosService.deleteTodo(id)
      todos.value = todos.value.filter(t => t.id !== id)
    } catch (err) {
      setError('Failed to delete todo')
    }
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.value.find(t => t.id === id)
    if (todo) {
      await updateTodo(id, { completed: !todo.completed })
    }
  }

  return {
    // State
    todos,
    loading,
    error,
    // Getters
    completedTodos,
    activeTodos,
    completedCount,
    totalCount,
    // Actions
    fetchTodos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    clearError
  }
})
