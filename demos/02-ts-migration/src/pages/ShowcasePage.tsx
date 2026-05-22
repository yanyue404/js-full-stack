import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { List } from '@/components/List'
import { useAsync } from '@/hooks/useAsync'
import { useTodoStore } from '@/store/todoStore'
import type { Todo, TodoStats, TodoFilter } from '@/types/todo'

function fakeFetch<T>(value: T, delay = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), delay))
}

function computeStats(todos: Todo[]): TodoStats {
  const done = todos.filter((t) => t.done).length
  const active = todos.length - done
  return { all: todos.length, active, done }
}

const STAT_LABELS: Record<TodoFilter, string> = {
  all: '总数',
  active: '未完成',
  done: '已完成'
}

export function ShowcasePage() {
  const todos = useTodoStore((s) => s.todos)
  const stats = computeStats(todos)

  const { loading, data, error } = useAsync(() => fakeFetch(stats), [todos.length])

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>泛型组件 List&lt;T&gt;</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            同一个 <code>List</code> 组件，传入不同类型的 items 会自动推断 renderItem 参数类型。
          </p>
          <List
            items={todos.slice(0, 5)}
            keyExtractor={(t) => t.id}
            emptyMessage="还没有待办，先去列表页添加几条吧。"
            className="space-y-2"
            renderItem={(todo, index) => (
              <div className="rounded border p-2 text-sm flex items-center justify-between">
                <span>
                  #{index + 1} {todo.text}
                </span>
                <span className="text-xs text-muted-foreground">
                  {todo.done ? '✓ 已完成' : '○ 未完成'}
                </span>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>自定义 Hook useAsync&lt;T&gt;</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            模拟一个异步请求，统计当前 todos 的数量。状态变化时自动重新执行。
          </p>
          {loading && <div>加载中...</div>}
          {error && <div className="text-destructive">出错了：{error.message}</div>}
          {data && (
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(data) as TodoFilter[]).map((key) => (
                <div key={key} className="rounded border p-3 text-center">
                  <div className="text-2xl font-semibold">{data[key]}</div>
                  <div className="text-xs text-muted-foreground">{STAT_LABELS[key]}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>工具类型示例</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <code>Pick&lt;Todo, 'text'&gt;</code> 用于创建 Todo 时的输入类型；
            <code>Partial&lt;Pick&lt;Todo, ...&gt;&gt;</code> 用于更新；
            <code>Record&lt;TodoFilter, number&gt;</code> 用于统计结果。
          </p>
          <p>详见 <code>src/types/todo.ts</code>。</p>
        </CardContent>
      </Card>
    </div>
  )
}
