import { useEffect, useState, type FormEvent } from 'react'
import { api, type Member } from '@/lib/api'
import { useAuth } from '@/store/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function MembersPage() {
  const isOwner = useAuth((s) => s.user?.role === 'owner')
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api<Member[]>('/members').then(setMembers, (e: Error) => setError(e.message))
  }, [])

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setError('')
    try {
      const m = await api<Member>('/members', { method: 'POST', body: Object.fromEntries(new FormData(form)) })
      setMembers((list) => [...list, m])
      form.reset()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">团队成员（{members.length}）</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-muted-foreground">{m.email}</p>
              </div>
              <Badge variant={m.role === 'owner' ? 'default' : 'muted'}>{m.role === 'owner' ? '负责人' : '成员'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader>
          <CardTitle className="text-base">添加成员</CardTitle>
        </CardHeader>
        <CardContent>
          {isOwner ? (
            <form onSubmit={invite} className="space-y-2">
              <Input name="name" placeholder="姓名" aria-label="姓名" required maxLength={50} />
              <Input name="email" type="email" placeholder="邮箱" aria-label="邮箱" required />
              <Input name="password" type="password" placeholder="初始密码（至少 8 位）" aria-label="初始密码" required minLength={8} />
              <Button className="w-full">添加</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">只有负责人可以添加成员。</p>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
