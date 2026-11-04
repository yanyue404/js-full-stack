import { useEffect, useState, type FormEvent } from 'react'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

interface Health {
  status: string
  db: string
  env?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? res.statusText)
  return body
}

export default function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')

  const load = () =>
    Promise.all([
      request<Health>('/health').then(setHealth),
      request<User[]>('/users').then(setUsers)
    ]).catch((e: Error) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    setError('')
    try {
      await request('/users', { method: 'POST', body: JSON.stringify(data) })
      form.reset()
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <main>
      <h1>Fullstack App</h1>
      <p className="health">
        API：
        <b className={health?.status === 'ok' ? 'ok' : 'bad'}>{health ? health.status : '连接中…'}</b>
        {health && ` · 数据库 ${health.db} · ${health.env}`}
      </p>

      <form onSubmit={onSubmit}>
        <input name="name" placeholder="姓名" required aria-label="姓名" />
        <input name="email" type="email" placeholder="邮箱" required aria-label="邮箱" />
        <button>添加用户</button>
      </form>
      {error && <p className="bad" role="alert">{error}</p>}

      <ul>
        {users.map((u) => (
          <li key={u.id}>
            <b>{u.name}</b> <span>{u.email}</span>
          </li>
        ))}
        {users.length === 0 && <li className="empty">暂无用户，添加一个试试。重启容器后数据仍在 = Volume 生效</li>}
      </ul>
    </main>
  )
}
