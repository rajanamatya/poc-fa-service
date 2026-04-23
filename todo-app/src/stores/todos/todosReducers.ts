import { Todo } from './types'

export function todosReducers() {
  return {
    addTodo: (state: Todo[], todo: Todo): Todo[] => [...state, todo],
    updateTodo: (state: Todo[], { id, updates }: { id: string; updates: Partial<Todo> }): Todo[] =>
      state.map(todo => todo.id === id ? { ...todo, ...updates } : todo),
    deleteTodo: (state: Todo[], id: string): Todo[] =>
      state.filter(todo => todo.id !== id),
    setTodos: (state: Todo[], todos: Todo[]): Todo[] => todos
  }
}
