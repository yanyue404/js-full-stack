/**
 * 集成测试：内存 PGlite + 真实 HTTP 请求，不依赖 Docker / 网络。
 * pnpm test
 */
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

process.env.NODE_ENV = 'test'
process.env.PGLITE_DIR = 'memory://'
process.env.DATABASE_URL = ''
process.env.OPENAI_API_KEY = ''

const { app } = await import('../src/app.js')
const { migrateDb, closeDb } = await import('../src/db/index.js')

let server: Server
let base = ''

async function api(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const text = await res.text()
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers }
}

const register = (ws: string, email: string) =>
  api('POST', '/api/auth/register', { workspaceName: ws, name: ws + ' Owner', email, password: 'password123' })

before(async () => {
  await migrateDb()
  server = app.listen(0)
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(async () => {
  server.close()
  await closeDb()
})

describe('TeamBoard API', () => {
  let ownerA = ''
  let ownerB = ''
  let memberA = ''
  let memberAId = ''

  test('注册工作区并登录', async () => {
    const a = await register('Acme', 'a@acme.com')
    assert.equal(a.status, 201)
    assert.equal(a.body.user.role, 'owner')
    ownerA = a.body.token
    ownerB = (await register('Globex', 'b@globex.com')).body.token

    assert.equal((await register('Dup', 'a@acme.com')).status, 409)
    assert.equal((await api('POST', '/api/auth/login', { email: 'a@acme.com', password: 'wrong-pass' })).status, 401)
    const ok = await api('POST', '/api/auth/login', { email: 'A@acme.com', password: 'password123' })
    assert.equal(ok.status, 200)
    assert.equal(ok.body.user.passwordHash, undefined)
  })

  test('参数校验与鉴权', async () => {
    assert.equal((await api('POST', '/api/auth/register', { email: 'bad' })).status, 400)
    assert.equal((await api('GET', '/api/tasks')).status, 401)
    assert.equal((await api('GET', '/api/tasks', undefined, 'not-a-jwt')).status, 401)
  })

  test('RBAC：只有 owner 能添加成员', async () => {
    const m = await api('POST', '/api/members', { name: 'Bob', email: 'bob@acme.com', password: 'password123' }, ownerA)
    assert.equal(m.status, 201)
    memberAId = m.body.id
    memberA = (await api('POST', '/api/auth/login', { email: 'bob@acme.com', password: 'password123' })).body.token
    const denied = await api('POST', '/api/members', { name: 'X', email: 'x@acme.com', password: 'password123' }, memberA)
    assert.equal(denied.status, 403)
    assert.equal((await api('GET', '/api/members', undefined, memberA)).body.length, 2)
  })

  test('任务 CRUD + 多租户隔离 + 乐观锁 + 软删除', async () => {
    const created = await api('POST', '/api/tasks', { title: '设计数据库', priority: 'high', assigneeId: memberAId }, ownerA)
    assert.equal(created.status, 201)
    assert.equal(created.body.assignee.name, 'Bob')
    const task = created.body

    // 不能把任务指派给其他工作区的人
    const bUser = (await api('GET', '/api/me', undefined, ownerB)).body.user
    assert.equal((await api('POST', '/api/tasks', { title: 'x', assigneeId: bUser.id }, ownerA)).status, 400)

    // 租户 B 看不到也改不了租户 A 的任务
    assert.equal((await api('GET', '/api/tasks', undefined, ownerB)).body.length, 0)
    assert.equal((await api('PATCH', `/api/tasks/${task.id}`, { status: 'done', version: 1 }, ownerB)).status, 404)

    // 乐观锁：两个人都基于 version 1 修改
    const first = await api('PATCH', `/api/tasks/${task.id}`, { status: 'doing', version: 1 }, memberA)
    assert.equal(first.status, 200)
    assert.equal(first.body.version, 2)
    const second = await api('PATCH', `/api/tasks/${task.id}`, { status: 'done', version: 1 }, ownerA)
    assert.equal(second.status, 409)
    assert.equal(second.body.code, 'VERSION_CONFLICT')
    assert.equal(second.body.detail.version, 2)

    // 软删除：成员不能删 owner 创建的任务；owner 删除后列表里消失
    assert.equal((await api('DELETE', `/api/tasks/${task.id}`, undefined, memberA)).status, 403)
    assert.equal((await api('DELETE', `/api/tasks/${task.id}`, undefined, ownerA)).status, 204)
    assert.equal((await api('GET', '/api/tasks', undefined, ownerA)).body.length, 0)
    assert.equal((await api('PATCH', `/api/tasks/${task.id}`, { status: 'done', version: 2 }, ownerA)).status, 404)
  })

  test('AI 拆解：无模型时规则兜底，确认后事务批量创建', async () => {
    const r = await api('POST', '/api/ai/breakdown', { goal: '上线会员系统，接入支付，然后做数据看板' }, memberA)
    assert.equal(r.status, 200)
    assert.equal(r.body.source, 'fallback')
    assert.deepEqual(
      r.body.tasks.map((t: { title: string }) => t.title),
      ['上线会员系统', '接入支付', '做数据看板']
    )

    const batch = await api('POST', '/api/tasks/batch', { tasks: r.body.tasks.map((t: { title: string; priority: string }) => ({ title: t.title, priority: t.priority })), source: 'ai' }, memberA)
    assert.equal(batch.body.created, 3)
    const list = (await api('GET', '/api/tasks', undefined, ownerA)).body
    assert.equal(list.length, 3)
    assert(list.every((t: { source: string }) => t.source === 'ai'))

    // 批量中有一条非法 → 整批拒绝
    const bad = await api('POST', '/api/tasks/batch', { tasks: [{ title: 'ok' }, { title: '' }] }, memberA)
    assert.equal(bad.status, 400)
    assert.equal((await api('GET', '/api/tasks', undefined, ownerA)).body.length, 3)
  })

  test('健康检查、指标与 requestId', async () => {
    const h = await api('GET', '/api/health')
    assert.equal(h.status, 200)
    assert.equal(h.body.db, 'up')
    assert.match(h.headers.get('x-request-id') ?? '', /^[\w-]+$/)
    const m = await fetch(base + '/metrics').then((r) => r.text())
    assert.match(m, /http_requests_total\{method="PATCH",route="\/api\/tasks\/:id",status="409"\} 1/)
    assert.match(m, /ai_breakdown_total\{source="fallback"\} 1/)
    assert.equal((await api('GET', '/api/nope')).status, 404)
  })
})
