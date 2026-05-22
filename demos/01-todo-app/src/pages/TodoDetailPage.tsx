import { useNavigate, useParams } from 'react-router'
import { useTodoStore } from '@/store/todoStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export function TodoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const todo = useTodoStore((s) => s.todos.find((t) => t.id === id))
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const toggleTodo = useTodoStore((s) => s.toggleTodo)

  if (!todo) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <p className="text-muted-foreground">未找到这条待办。</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            返回列表
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>待办详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">标题</label>
            <Input
              value={todo.text}
              onChange={(e) => updateTodo(todo.id, { text: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">备注</label>
            <Input
              value={todo.note ?? ''}
              placeholder="可选：补充一些细节"
              onChange={(e) => updateTodo(todo.id, { note: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              创建于 {new Date(todo.createdAt).toLocaleString()}
            </span>
            <Button
              variant={todo.done ? 'outline' : 'default'}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.done ? '标记为未完成' : '标记为已完成'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
