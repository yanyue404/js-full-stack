import { ChevronLeft, ChevronRight, Sparkles, Trash2 } from 'lucide-react'
import type { Member, Priority, Status, Task } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

export const STATUSES: { key: Status; label: string }[] = [
  { key: 'todo', label: '待办' },
  { key: 'doing', label: '进行中' },
  { key: 'done', label: '已完成' }
]
export const PRIORITY_LABEL: Record<Priority, string> = { high: '高', medium: '中', low: '低' }

interface Props {
  task: Task
  members: Member[]
  canDelete: boolean
  onPatch: (task: Task, patch: Partial<Pick<Task, 'status' | 'assigneeId'>>) => void
  onDelete: (task: Task) => void
}

export function TaskCard({ task, members, canDelete, onPatch, onDelete }: Props) {
  const idx = STATUSES.findIndex((s) => s.key === task.status)
  const overdue = task.dueDate && task.status !== 'done' && task.dueDate < new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-2 rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-medium leading-snug">{task.title}</p>
        {canDelete && (
          <button
            aria-label="删除任务"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(task)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={task.priority}>{PRIORITY_LABEL[task.priority]}优先级</Badge>
        {task.source === 'ai' && (
          <Badge variant="ai">
            <Sparkles className="mr-1 h-3 w-3" />
            AI
          </Badge>
        )}
        {task.dueDate && <Badge variant={overdue ? 'high' : 'muted'}>截止 {task.dueDate}</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">v{task.version}</span>
      </div>
      <div className="flex items-center gap-1">
        <Select
          aria-label="负责人"
          className="h-8 flex-1 text-xs"
          value={task.assigneeId ?? ''}
          onChange={(e) => onPatch(task, { assigneeId: e.target.value || null })}
        >
          <option value="">未指派</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="移到上一列"
          disabled={idx === 0}
          onClick={() => onPatch(task, { status: STATUSES[idx - 1].key })}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          aria-label="移到下一列"
          disabled={idx === STATUSES.length - 1}
          onClick={() => onPatch(task, { status: STATUSES[idx + 1].key })}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
