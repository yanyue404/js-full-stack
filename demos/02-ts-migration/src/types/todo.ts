export interface Todo {
  id: string
  text: string
  done: boolean
  note?: string
  createdAt: number
}

export type TodoFilter = 'all' | 'active' | 'done'

export type CreateTodoInput = Pick<Todo, 'text'>

export type UpdateTodoInput = Partial<Pick<Todo, 'text' | 'note' | 'done'>>

export type TodoStats = Record<TodoFilter, number>
