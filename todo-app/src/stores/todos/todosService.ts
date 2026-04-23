import { Todo } from './types'

const STORAGE_KEY = 'todos'

export const todosService = {
  getTodos(): Todo[] {
    if (import.meta.env.VITE_USE_LOCAL_STORAGE === 'true') {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : [
        { id: '1', title: 'Learn Vue 3', completed: false, createdAt: new Date().toISOString() },
        { id: '2', title: 'Build a todo app', completed: false, createdAt: new Date().toISOString() },
        { id: '3', title: 'Deploy to AWS', completed: false, createdAt: new Date().toISOString() }
      ]
    }
    // TODO: Replace with API call when aws-deploy skill is used
    return []
  },

  saveTodos(todos: Todo[]): void {
    if (import.meta.env.VITE_USE_LOCAL_STORAGE === 'true') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    }
    // TODO: Replace with API call when aws-deploy skill is used
  },

  async createTodo(title: string): Promise<Todo> {
    const todo: Todo = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date().toISOString()
    }
    
    const todos = this.getTodos()
    todos.push(todo)
    this.saveTodos(todos)
    
    return todo
  },

  async updateTodo(id: string, updates: Partial<Omit<Todo, 'id'>>): Promise<Todo> {
    const todos = this.getTodos()
    const index = todos.findIndex(t => t.id === id)
    
    if (index === -1) {
      throw new Error('Todo not found')
    }
    
    todos[index] = { ...todos[index], ...updates }
    this.saveTodos(todos)
    
    return todos[index]
  },

  async deleteTodo(id: string): Promise<void> {
    const todos = this.getTodos()
    const filtered = todos.filter(t => t.id !== id)
    this.saveTodos(filtered)
  }
}
