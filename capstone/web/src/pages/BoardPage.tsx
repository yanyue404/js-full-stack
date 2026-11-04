import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { api, ApiError, type Member, type Task } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { AiPanel } from '@/components/AiPanel'
import { STATUSES, TaskCard } from '@/components/TaskCard'

export function BoardPage() {
  const user = useAuth((s) => s.user)!
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api<Task[]>('/tasks'), api<Member[]>('/members')])
      setTasks(t)
      setMembers(m)
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const replace = (t: Task) => setTasks((list) => list.map((x) => (x.id === t.id ? t : x)))

  async function createTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    try {
      const task = await api<Task>('/tasks', {
        method: 'POST',
        body: { title: data.title, priority: data.priority, assigneeId: data.assigneeId || null, dueDate: data.dueDate || null }
      })
      setTasks((list) => [task, ...list])
      form.reset()
      setNotice(null)
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    }
  }

  async function patchTask(task: Task, patch: Partial<Task>) {
    try {
      replace(await api<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: { ...patch, version: task.version } }))
    } catch (err) {
      // 乐观锁冲突：别人先改了，用服务端返回的最新版本覆盖本地
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        replace(err.detail as Task)
        setNotice({ kind: 'info', text: `「${task.title}」刚被其他人修改过，已刷新为最新版本，请确认后再操作。` })
      } else {
        setNotice({ kind: 'error', text: (err as Error).message })
        if (err instanceof ApiError && err.status === 404) load()
      }
    }
  }

  async function deleteTask(task: Task) {
    if (!confirm(`删除「${task.title}」？`)) return
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' })
      setTasks((list) => list.filter((x) => x.id !== task.id))
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <form onSubmit={createTask} className="flex flex-wrap items-center gap-2 self-start rounded-lg border bg-white p-3">
          <Input name="title" placeholder="新任务标题" aria-label="任务标题" required maxLength={100} className="min-w-48 flex-1" />
          <Select name="priority" aria-label="优先级" defaultValue="medium">
            <option value="high">高优先级</option>
            <option value="medium">中优先级</option>
            <option value="low">低优先级</option>
          </Select>
          <Select name="assigneeId" aria-label="负责人" defaultValue="">
            <option value="">未指派</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
          <Input name="dueDate" type="date" aria-label="截止日期" className="w-auto" />
          <Button>
            <Plus className="h-4 w-4" /> 添加
          </Button>
        </form>
        <AiPanel onCreated={load} />
      </div>

      {notice && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${notice.kind === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}
        >
          {notice.text}
          <button className="text-xs underline" onClick={() => setNotice(null)}>
            关闭
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {STATUSES.map((col) => {
          const list = tasks.filter((t) => t.status === col.key)
          return (
            <section key={col.key} className="rounded-lg bg-slate-100 p-3">
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
                {col.label}
                <span className="rounded-full bg-white px-2 text-xs text-muted-foreground">{list.length}</span>
              </h2>
              <div className="space-y-2">
                {list.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    canDelete={user.role === 'owner' || t.createdBy === user.id}
                    onPatch={patchTask}
                    onDelete={deleteTask}
                  />
                ))}
                {list.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">暂无任务</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
