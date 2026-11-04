import { useState, type FormEvent } from 'react'
import { api, type Member } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const login = useAuth((s) => s.login)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setPending(true)
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget))
      const r = await api<{ token: string; user: Member }>(`/auth/${mode}`, { method: 'POST', body })
      login(r.token, r.user)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === 'login' ? '登录 TeamBoard' : '创建团队工作区'}</CardTitle>
          <p className="text-sm text-muted-foreground">团队任务看板 · 全栈综合项目</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <Input name="workspaceName" placeholder="团队名称" aria-label="团队名称" required maxLength={50} />
                <Input name="name" placeholder="你的名字" aria-label="你的名字" required maxLength={50} />
              </>
            )}
            <Input name="email" type="email" placeholder="邮箱" aria-label="邮箱" required autoComplete="email" />
            <Input
              name="password"
              type="password"
              placeholder="密码（至少 8 位）"
              aria-label="密码"
              required
              minLength={mode === 'register' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button className="w-full" disabled={pending}>
              {pending ? '请稍候…' : mode === 'login' ? '登录' : '注册并创建工作区'}
            </Button>
          </form>
          <button
            type="button"
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setError('')
            }}
          >
            {mode === 'login' ? '还没有账号？创建工作区' : '已有账号？去登录'}
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
