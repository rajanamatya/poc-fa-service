import { Todo } from './types'

const STORAGE_KEY = 'todos'
const useLocal = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true'

function getLocalTodos(): Todo[] {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

function saveLocalTodos(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

export const todosService = {
  async getTodos(): Promise<Todo[]> {
    if (useLocal) return getLocalTodos()

    const res = await fetch('/api/todos')
    if (!res.ok) throw new Error(`Failed to fetch todos: ${res.status}`)
    return res.json()
  },

  async createTodo(title: string): Promise<Todo> {
    if (useLocal) {
      const todo: Todo = {
        id: Date.now().toString(),
        title,
        completed: false,
        createdAt: new Date().toISOString(),
      }
      const todos = getLocalTodos()
      todos.push(todo)
      saveLocalTodos(todos)
      return todo
    }

    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error(`Failed to create todo: ${res.status}`)
    return res.json()
  },

  async updateTodo(id: string, updates: Partial<Omit<Todo, 'id'>>): Promise<Todo> {
    if (useLocal) {
      const todos = getLocalTodos()
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) throw new Error('Todo not found')
      todos[index] = { ...todos[index], ...updates }
      saveLocalTodos(todos)
      return todos[index]
    }

    const res = await fetch(`/api/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error(`Failed to update todo: ${res.status}`)
    return res.json()
  },

  async deleteTodo(id: string): Promise<void> {
    if (useLocal) {
      const todos = getLocalTodos()
      saveLocalTodos(todos.filter((t) => t.id !== id))
      return
    }

    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Failed to delete todo: ${res.status}`)
  },
}
