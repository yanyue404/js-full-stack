import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Trash2, ChevronRight } from 'lucide-react'
import { useTodoStore, type TodoFilter } from '@/store/todoStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '未完成' },
  { value: 'done', label: '已完成' }
]

export function TodoListPage() {
  const todos = useTodoStore((s) => s.todos)
  const filter = useTodoStore((s) => s.filter)
  const addTodo = useTodoStore((s) => s.addTodo)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)
  const removeTodo = useTodoStore((s) => s.removeTodo)
  const setFilter = useTodoStore((s) => s.setFilter)
  const clearCompleted = useTodoStore((s) => s.clearCompleted)

  const [text, setText] = useState('')

  const filtered = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.done)
    if (filter === 'done') return todos.filter((t) => t.done)
    return todos
  }, [todos, filter])

  const remaining = todos.filter((t) => !t.done).length

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    addTodo(value)
    setText('')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="今天要做点什么？"
          aria-label="新建待办"
        />
        <Button type="submit" disabled={!text.trim()}>
          添加
        </Button>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'ghost'}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>剩余 {remaining} 条</span>
          <Button size="sm" variant="ghost" onClick={clearCompleted}>
            清除已完成
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            还没有待办，添加一条试试吧。
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {filtered.map((todo) => (
            <li key={todo.id}>
              <Card>
                <CardContent className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={todo.done}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    aria-label={`切换 ${todo.text}`}
                  />
                  <span
                    className={cn(
                      'flex-1 text-sm',
                      todo.done && 'line-through text-muted-foreground'
                    )}
                  >
                    {todo.text}
                  </span>
                  <Link
                    to={`/todos/${todo.id}`}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="查看详情"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeTodo(todo.id)}
                    aria-label={`删除 ${todo.text}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
