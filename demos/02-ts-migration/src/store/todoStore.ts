import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Todo, TodoFilter, UpdateTodoInput } from '@/types/todo'

interface TodoState {
  todos: Todo[]
  filter: TodoFilter
}

interface TodoActions {
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
  updateTodo: (id: string, patch: UpdateTodoInput) => void
  setFilter: (filter: TodoFilter) => void
  clearCompleted: () => void
}

export type TodoStore = TodoState & TodoActions

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      todos: [],
      filter: 'all',
      addTodo: (text) =>
        set((state) => ({
          todos: [
            { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() },
            ...state.todos
          ]
        })),
      toggleTodo: (id) =>
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        })),
      removeTodo: (id) =>
        set((state) => ({ todos: state.todos.filter((t) => t.id !== id) })),
      updateTodo: (id, patch) =>
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...patch } : t))
        })),
      setFilter: (filter) => set({ filter }),
      clearCompleted: () => set((state) => ({ todos: state.todos.filter((t) => !t.done) }))
    }),
    { name: 'todo-storage-ts' }
  )
)
