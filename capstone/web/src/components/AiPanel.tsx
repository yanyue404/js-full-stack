import { useState, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { api, type Breakdown } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PRIORITY_LABEL } from '@/components/TaskCard'

/** AI 拆解：先预览、由人勾选确认，再批量落库 —— AI 只给建议，不直接写数据 */
export function AiPanel({ onCreated }: { onCreated: () => void }) {
  const [result, setResult] = useState<Breakdown | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function breakdown(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const goal = String(new FormData(e.currentTarget).get('goal'))
    setPending(true)
    setError('')
    try {
      const r = await api<Breakdown>('/ai/breakdown', { method: 'POST', body: { goal } })
      setResult(r)
      setPicked(new Set(r.tasks.map((_, i) => i)))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  async function create() {
    if (!result) return
    setPending(true)
    try {
      const tasks = result.tasks.filter((_, i) => picked.has(i)).map(({ title, priority }) => ({ title, priority }))
      await api('/tasks/batch', { method: 'POST', body: { tasks, source: 'ai' } })
      setResult(null)
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  const toggle = (i: number) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-600" /> AI 拆解任务
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={breakdown} className="flex gap-2">
          <Input name="goal" placeholder="描述一个目标，例如：下周上线会员积分功能" aria-label="目标" required minLength={2} maxLength={200} />
          <Button disabled={pending}>{pending && !result ? '思考中…' : '拆解'}</Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {result && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {result.source === 'ai' ? (
                <Badge variant="ai">由 {result.model} 生成</Badge>
              ) : (
                <Badge variant="medium">AI 不可用，已使用规则兜底</Badge>
              )}{' '}
              勾选需要的子任务：
            </p>
            <ul className="space-y-1">
              {result.tasks.map((t, i) => (
                <li key={i}>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={picked.has(i)} onChange={() => toggle(i)} />
                    <span className="flex-1">{t.title}</span>
                    <Badge variant={t.priority}>{PRIORITY_LABEL[t.priority]}</Badge>
                    <span className="w-12 text-right text-xs text-muted-foreground">{t.estimateHours}h</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" onClick={create} disabled={pending || picked.size === 0}>
                添加 {picked.size} 个任务
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
                取消
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
