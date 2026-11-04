import { useAuth } from '@/store/auth'

export type Status = 'todo' | 'doing' | 'done'
export type Priority = 'low' | 'medium' | 'high'

export interface Member {
  id: string
  name: string
  email: string
  role: 'owner' | 'member'
  workspaceId: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: Status
  priority: Priority
  assigneeId: string | null
  assignee: { id: string; name: string } | null
  createdBy: string
  dueDate: string | null
  source: 'manual' | 'ai'
  version: number
  createdAt: string
}

export interface Breakdown {
  source: 'ai' | 'fallback'
  model?: string
  tasks: { title: string; priority: Priority; estimateHours: number }[]
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public detail?: unknown
  ) {
    super(message)
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = useAuth.getState().token
  const res = await fetch(`/api${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401 && token) useAuth.getState().logout()
    throw new ApiError(res.status, data.error ?? res.statusText, data.code, data.detail)
  }
  return data as T
}
