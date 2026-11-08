# 附录 A：Cloudflare（独立开发者）

> 不买云服务器，把域名、站点、API、数据库、文件、邮件和防刷接到同一条边缘上。

本附录给独立做产品的人。正文第五讲走 Vercel 或一台云服务器，第八讲按阿里云 / 腾讯云记云产品。用户和学员主要在中国大陆时，仍然走那两条。Cloudflare 适合个人产品、海外访问，以及你接受流量经过它的网络的时候。

下面的免费额度摘自 2026 年 10 月的官方定价页。Workers Logs 从 2026-12-01 起改用 Observability 定价。数字会变，上线前打开每节末尾的文档再对一次。

## 写在前面：三条上线路径

| | 云服务器（第五讲） | Vercel | Cloudflare |
| --- | --- | --- | --- |
| 你在管什么 | 机器、Docker、Nginx、证书 | 构建和平台限额 | 域名、Worker、绑定 |
| 长进程、任意端口 | 可以 | 受平台限制 | 单次有 CPU 时间上限 |
| 数据库 | 自己装 PostgreSQL | 外置数据库 | D1，或用 Hyperdrive 连已有的 PostgreSQL |
| 费用形态 | 机器按月 | 按席位和用量 | 免费档有硬顶；付费从每月 5 美元起，超出按量 |
| 国内访问 | 可控 | 看线路 | 不稳定，作正文方案要先自己测 |

Workers 是隔离的 JavaScript 运行时，接口长得像浏览器：`fetch`、`Request`、`Response`、Web Crypto。它没有一直转着的进程，不能 `listen` 一个端口，也没有完整的文件系统。第三讲的 Hono 可以搬上来。Express 依赖 Node 的 `http.Server`，留在云服务器上。

## 1. 产品地图

先按要做的事挑，再写代码。

| 你要做的事 | 用这个 | 个人项目里的位置 |
| --- | --- | --- |
| 域名解析、隐藏源站 IP | DNS，橙色云代理 | 一切的入口 |
| 免费 HTTPS | SSL/TLS | 代理打开后自动签证书 |
| 静态资源加速、清缓存 | CDN / Cache | 图片、JS、CSS |
| API、鉴权、Webhook | Workers | 第三讲的后端 |
| 静态站、SPA、全栈前端 | Workers Static Assets | 新项目用这个 |
| 已有的 Pages 项目 | Pages | 只维护，新项目别再建 |
| 配置、功能开关、读多写少 | KV | 可以短暂不一致的数据 |
| 用户、文章、订单 | D1 | 个人产品的主库（SQLite） |
| 已有 PostgreSQL | Hyperdrive | 第四讲的库留在原地 |
| 上传文件、备份 | R2 | 第八讲 OSS 的位置，出口流量免费 |
| 一个房间 / 一个用户一份强一致状态 | Durable Objects | 聊天室、协同、精确计数 |
| 请求里做不完的活 | Queues | 发信、调用模型、处理上传 |
| 每小时清一次过期数据 | Cron Triggers | 短任务 |
| 要睡几小时再继续的多步流程 | Workflows | 大多数产品先不需要 |
| 用自己的域名收信 | Email Routing | 转发到现有邮箱，免费 |
| 发注册信、通知 | Email Sending | 任意收件人需要 Workers 付费计划，目前仍是 Beta |
| 表单和登录防脚本 | Turnstile | 服务端必须再验一次 |
| 家里或内网的服务没有公网 IP | Tunnel | 开发时的临时地址，或长期代替暴露端口 |
| 看 Worker 报错 | Workers Logs | `console.log` 进这里 |
| 看站点访问量 | Web Analytics | 一段脚本，不用 cookie |
| 第六讲的模型密钥、缓存、日志 | AI Gateway | 已有 OpenAI / Claude 账号时先用这个 |
| 不想自备模型密钥的小模型 | Workers AI | 模型名以控制台当前列表为准 |
| 自己做向量检索 | Vectorize | 第六讲 RAG 要自己管索引时 |

这些先别开，个人产品用不上，部分还按流量计费：Load Balancing、Spectrum、Waiting Room、Argo、Cache Reserve、Workers for Platforms、Cloudflare Images、Stream。图片放静态资源或 R2。要做缩略图和视频点播时再单独评估。

## 2. 心智模型

```
浏览器
  │  DNS 把域名指到 Cloudflare
  ▼
边缘（离用户近的节点）
  ├── 橙色云：代理。TLS、缓存、DDoS 在这里做，源站 IP 不直接暴露
  ├── 灰色云：只做 DNS。SSH、不能被代理的记录用这个
  ├── 静态资源：命中文件就直接返回
  └── Worker：跑你的 fetch 处理函数
        │
        ▼  绑定（binding）= 配好的资源，从 env 上拿
        KV / D1 / R2 / Hyperdrive / Queue / Durable Object
```

绑定在配置文件里声明。代码里写 `env.DB`、`env.BUCKET`，密钥走 `wrangler secret`，进 Git 的只有绑定名字。

橙色云只代理 HTTP(S)。邮件的 MX、SSH、数据库端口保持灰色云，或交给 Tunnel / Email Routing 自己写记录。

本地开发用 Wrangler，密钥放项目根的 `.dev.vars`（加入 `.gitignore`）。生产密钥用：

```bash
pnpm dlx wrangler secret put TURNSTILE_SECRET
```

## 3. 域名、DNS 与 HTTPS

1. 把域名的 NS 改成 Cloudflare 分配的两台。
2. 添加记录。要加速和上证书的网站用橙色云；只需要解析的用灰色云。
3. SSL/TLS 模式用 **Full (strict)**。源站是 Worker 或 Static Assets 时，证书由平台签，没有一台要你自己管的 Nginx。
4. 打开 Always Use HTTPS。

Flexible 会让访客到 Cloudflare 是 HTTPS、Cloudflare 到源站是明文。源站在你自己的机器上时，源站也要有一张有效证书，模式选 Full (strict)。

Worker 可以先用 `*.workers.dev` 看效果。自定义域名要求该域名在同一个 Cloudflare 账号下。

## 4. 缓存

静态资源随 Workers Static Assets 上传后，由边缘自动缓存，这类请求在 Workers 定价里免费且不限次数。

登录后的 HTML、带用户数据的 JSON 默认不要进公共缓存。动态接口要缓存时，按路径和 `Cache-Control` 单独配，并准备清缓存的办法。仪表盘可以按 URL 或全站清除。

Workers Cache 挡住的动态请求仍然算一次 Worker 请求，只是命中时不耗 CPU。这和「静态资源请求免费」是两笔账。

## 5. Workers

### 5.1 最小项目

```bash
pnpm create cloudflare@latest my-app --framework=react
cd my-app
pnpm dlx wrangler dev
pnpm dlx wrangler deploy
```

纯 API 可以不带前端框架。配置用 `wrangler.jsonc`，`compatibility_date` 写成创建项目当天。用了 Cloudflare 的 Vite 插件时，不用再写 `assets.directory`。

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-app",
  "main": "src/index.ts",
  "compatibility_date": "2026-11-09",
  "assets": {
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*"]
  }
}
```

`run_worker_first` 让 `/api/*` 先进入 Worker。其余路径先找静态文件；SPA 找不到文件时回 `index.html`。

第三讲的 Hono 直接导出即可：

```ts
import { Hono } from 'hono'

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

export default app
```

Zod 是纯 JavaScript，校验可以照第三讲写。类型用 `pnpm dlx wrangler types` 生成。

### 5.2 免费档的真实限制

免费计划每天 10 万次请求（静态资源请求另计，免费且不限）。单次调用 CPU 时间 10 毫秒。等待 `fetch` 或数据库返回的时间不算进这 10 毫秒。

10 毫秒 CPU 装不下这些事：高成本的密码哈希、图片解码、大 JSON 的重计算。第三讲如果用 bcrypt，免费 Worker 上会超时。密码哈希放到仍由 Node 跑的服务上，或改用付费计划（单次 CPU 默认上限 30 秒，最高可配到 5 分钟；Cron 和队列消费者最高 15 分钟）。

付费计划最低每月 5 美元，含 1000 万次请求，超出每百万次 0.30 美元；CPU 含 3000 万毫秒，超出每百万毫秒 0.02 美元。没有流量出口费。

下面任一情况出现，就值得交这 5 美元：免费档每天到点后接口直接失败；单次 CPU 需要超过 10 毫秒；要给任意邮箱发事务邮件。

## 6. 静态站点

新项目用 Workers Static Assets：一次部署同时包含页面和 Worker。已经在跑的 Pages 项目继续维护，新项目不再建 Pages。

| 访问 | 行为 |
| --- | --- |
| 存在对应文件 | 直接返回该文件 |
| `/api/*`（配了 `run_worker_first`） | 进入 Worker |
| SPA 且没有对应文件 | 返回 `index.html` |
| 没有 Worker、也没有文件 | 404 |

前端仍是本教程的 Vite + React。构建产物交给同一次 `wrangler deploy`。这是第五讲 `vercel --prod` 的另一条路：平台负责证书和缓存，你负责 `dist` 和 `/api`。

## 7. 存储怎么选

| 数据 | 放哪 | 原因 |
| --- | --- | --- |
| 功能开关、站点配置 | KV | 读多写少，短暂不一致可以接受 |
| 用户、订单、要事务的表 | D1 | 关系型，个人产品够用 |
| 第四讲已建好的 PostgreSQL | Hyperdrive | 库不动，Worker 过去连 |
| 头像、附件、导出文件 | R2 | 对象存储，出口流量免费 |
| 某个房间里的在线状态 | Durable Objects | 需要「这一份」强一致 |

余额、库存、唯一约束放在 D1 或 PostgreSQL。KV 是最终一致的，读到旧值是正常现象。

## 8. KV

适合功能开关和公开配置。免费计划：每天 10 万次读、1000 次写、1000 次删除、1000 次列表，存储 1 GB。任一上限超出后，该类操作直接失败，到 UTC 0 点恢复。写操作很贵，不要把 KV 当数据库来更新。

```jsonc
"kv_namespaces": [
  { "binding": "FLAGS", "id": "<wrangler kv namespace create 输出的 id>" }
]
```

```ts
app.get('/api/flags', async (c) => {
  const maintenance = await c.env.FLAGS.get('maintenance')
  return c.json({ maintenance: maintenance === 'on' })
})
```

控制台和 Wrangler 里的读写同样计入额度。

## 9. D1

D1 是托管的 SQLite。个人产品的用户表、内容表放这里。第四讲的建模、索引、迁移思路继续用；隔离级别和 PostgreSQL 那一套扩展不要假定这里都有。Drizzle 有 D1 驱动，复杂查询仍以 SQL 为准。

免费计划：每天 500 万行读取、10 万行写入，存储合计 5 GB，最多 10 个库。读的是扫描行数，不是返回行数。一张 5000 行的表做无索引的 `SELECT *`，一次就算 5000 行读取。第四讲的索引在这里同时决定速度和账单。超出当日额度后查询直接失败。付费计划去掉这个硬顶，改为按月包含用量，超出再计费。

```bash
pnpm dlx wrangler d1 create my-app
pnpm dlx wrangler d1 migrations create my-app init
pnpm dlx wrangler d1 migrations apply my-app --local
pnpm dlx wrangler d1 migrations apply my-app --remote
```

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_users_created_at ON users (created_at);
```

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "my-app",
    "database_id": "<create 输出的 id>"
  }
]
```

```ts
app.get('/api/users/:id', async (c) => {
  const user = await c.env.DB.prepare(
    'SELECT id, email FROM users WHERE id = ?'
  )
    .bind(c.req.param('id'))
    .first()
  if (!user) return c.json({ error: 'not found' }, 404)
  return c.json(user)
})
```

每次查询返回的 `meta.rows_read` / `meta.rows_written` 就是计费用量。仪表盘里跑的 SQL 也计费。

## 10. R2

R2 对应第八讲的 OSS / COS。标准存储免费档每月 10 GB、100 万次 A 类操作（上传、列举等）、1000 万次 B 类操作（下载、HEAD），出口流量免费。删除不计费。低频存储没有免费档，个人项目用标准存储。

```bash
pnpm dlx wrangler r2 bucket create my-app
```

```jsonc
"r2_buckets": [{ "binding": "BUCKET", "bucket_name": "my-app" }]
```

```ts
app.put('/api/files/:key', async (c) => {
  const key = c.req.param('key')
  await c.env.BUCKET.put(key, c.req.raw.body, {
    httpMetadata: { contentType: c.req.header('content-type') || 'application/octet-stream' }
  })
  return c.json({ key })
})

app.get('/api/files/:key', async (c) => {
  const obj = await c.env.BUCKET.get(c.req.param('key'))
  if (!obj) return c.json({ error: 'not found' }, 404)
  return new Response(obj.body, {
    headers: { 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream' }
  })
})
```

热点小文件优先放 Static Assets，或在前面加缓存。R2 适合上传、附件和备份。公开读如果每天把同一批小对象打出上千万次，会超出 B 类免费额度。

桶不要对公网裸奔。给浏览器的上传用限时、限权限的凭证，或让请求先经过你的 Worker 做登录校验。

## 11. Hyperdrive

第四讲的 PostgreSQL 已经在用，就留在原地，用 Hyperdrive 从 Worker 连接。它管的是边缘到数据库的连接复用。免费计划每天 10 万次查询（含 `SELECT`、写入和 DDL），超出后失败。

数据库要能被 Hyperdrive 连上，连接串放 secret。账号只用业务需要的权限。迁移、种子数据和事务仍按第四讲，在 PostgreSQL 里做。

D1 和 Hyperdrive 二选一作为主库。个人新产品用 D1。已经有库、要 PostgreSQL 的类型和隔离级别时用 Hyperdrive。

## 12. 定时任务、队列和单点协调

### 12.1 Cron

```jsonc
"triggers": { "crons": ["15 * * * *"] }
```

```ts
import { Hono } from 'hono'

type Env = { DB: D1Database }

const app = new Hono<{ Bindings: Env }>()
app.get('/api/health', (c) => c.json({ ok: true }))

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()).run()
    )
  }
}
```

免费计划的 Cron 同样只有每次 10 毫秒 CPU。用它删一小批过期行、或往队列里丢一个任务。生成报表、批量调用模型放到付费计划的队列消费者里。

### 12.2 Queues

请求路径里只负责入队：发信、调模型、处理上传放到消费者。一条成功投递的消息大约计 3 次操作（写、读、删），重试另计读取。免费计划每天 1 万次操作，保留 24 小时且不能改。量级就是每天几千条消息。付费计划含每月 100 万次操作，保留默认 4 天，最长 14 天。

### 12.3 Durable Objects

一个聊天室、一份文档、一个用户的限流计数，需要「全世界同一时刻只有这一份状态」时用。免费计划只能用 SQLite 存储后端。它是协调原语，整站的用户表仍放 D1。

WebSocket 连上之后如果不用休眠 API，对象会按存活时间计费。有长连接时再查 Durable Objects 的休眠文档。

### 12.4 Workflows

步骤之间要睡觉、失败要接着跑（注册当天一封信，三天后再一封）时用。免费计划每天 3000 步，请求数和 Workers 共用每天 10 万的额度。大多数个人产品用 Cron 加 Queues 就够。

## 13. 邮件

收信和发信现在都在 Email Service 下面。

**Email Routing**（免费计划可用）：域名托管在 Cloudflare 上之后，在控制台打开 Routing，添加并验证你的 Gmail 或其他邮箱，再把 `hello@你的域名` 转到它。MX 由产品写入。也可以把进站邮件交给 Worker 处理（过滤、存进 D1）。

**Email Sending**（Beta）：注册确认、订单通知这类事务邮件。发给账号里已验证的目标地址，免费计划也可以。发给任意用户需要 Workers 付费计划。上线前把 SPF、DKIM、DMARC 配齐，否则信会进垃圾箱。文档以 [Email Service](https://developers.cloudflare.com/email-service/) 为准。

个人域名的第一封信，用 Routing 转到已有邮箱。产品要给用户发信时再开 Sending。

## 14. Turnstile

表单、注册、登录前面加 Turnstile。它不要求站点一定经过橙色云。组件形态用 Managed：多数人无感通过，可疑访问才出现勾选。

前端只拿到 token。Worker 用密钥向站点验证接口再问一次，`success === true` 才继续。只在浏览器里判断「组件出现过」等于没有防刷。

```ts
app.post('/api/login', async (c) => {
  const form = await c.req.formData()
  const token = String(form.get('cf-turnstile-response') || '')
  const outcome = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: c.env.TURNSTILE_SECRET,
      response: token
    })
  }).then((res) => res.json() as Promise<{ success: boolean }>)

  if (!outcome.success) return c.json({ error: '验证失败' }, 400)
  // 接着做第三讲的登录
  return c.json({ ok: true })
})
```

密钥用 `wrangler secret put`，站点密钥（site key）可以放在前端。

## 15. Tunnel

机器没有公网 IP，或你不想在安全组里对全世界打开 80/443 时用 Tunnel。本机跑 `cloudflared`，由它主动连出 Cloudflare，访客从你的域名进来。

开发时要一个临时 HTTPS，给 Webhook 或手机访问：

```bash
cloudflared tunnel --url http://localhost:3000
```

它会给一个 `trycloudflare.com` 地址，进程停了就失效，不能当生产域名。

长期使用要建命名隧道，把正式域名指到本机端口，并把 `cloudflared` 做成开机服务。源站仍可以是第五讲的 Docker Compose。步骤以 [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/) 为准。隧道凭证文件不要提交进仓库。

## 16. 安全默认项

橙色云打开后，免费计划包含无上限的 DDoS 缓解和基础安全级别。Bot Fight Mode 在安全设置里打开。自定义 WAF 规则的条数随计划变化，个人项目先用托管规则和 Turnstile。

| 做 | 原因 |
| --- | --- |
| 密钥只进 `wrangler secret` 和 `.dev.vars` | 配置文件会进 Git |
| 登录和公开表单验 Turnstile | 挡住脚本注册 |
| 登录后的页面不进公共缓存 | 避免别人拿到你的 HTML |
| SSH、数据库端口用灰色云或 Tunnel | 橙色云不代理这些协议 |
| 上传先鉴权再写 R2 | 桶地址被猜到也不应能写 |

第八讲的限流、超时、降级仍然适用。边缘只是把入口换了地方，业务上的失败要有明确的 HTTP 状态和日志。

重定向优先用控制台的 Redirect Rules（整站 HTTPS、`www` 到根域名）。规则表达得了的事情不必写 Worker。

## 17. 日志、访问统计和 AI

`console.log`、未捕获异常进 Workers Logs。免费计划每天 20 万条、保留 3 天；付费含每月 2000 万条、保留 7 天，超出每百万条 0.60 美元。2026-12-01 起这张价目改为 Observability 定价，以当时文档为准。

排障时先看这次部署的版本，再按路径过滤日志。日志保留天数短，线上事故当天收。

Web Analytics 在页面加一段脚本即可，用它看访问量和核心性能，统计本身不靠 cookie。它替代不了第八讲的接口监控：5xx、慢查询、D1 行数要在 Workers 和 D1 的指标里看。

和第六讲的接法：

| 已有条件 | 接法 |
| --- | --- |
| 已经在调 OpenAI / Claude | AI Gateway 放在前面，集中管密钥、缓存、日志和限流 |
| 小功能，不想自备密钥 | Workers AI，`env.AI.run`，模型名看控制台 |
| RAG 要自己管切块和索引 | Vectorize 存向量，原文放 D1 或 R2 |
| 希望上传文档就能问 | AI Search |

模型单价和上下文长度变化很快，费用仍按第六讲的办法估算，再在对应产品的定价页上核对。

## 18. 部署、预览和回滚

```bash
pnpm dlx wrangler deploy
```

仓库推送后自动部署，用 Workers Builds 连接 Git。分支环境用 Workers Previews。预览用的 D1、R2、KV 有的隔离、有的和生产共用。向预览地址写数据之前，先在绑定配置里确认指向哪一个库。

版本可以回滚到上一份 Worker 代码。回滚不恢复 D1 和 R2 里的数据。破坏性迁移照第四讲：先加后迁，确认没用了再删列。

## 19. 三条能上线的组合

**落地页或文档站。** DNS + Static Assets + Always Use HTTPS + Web Analytics + Email Routing。没有数据库。

**带登录的个人产品。** Static Assets + Hono + D1 + R2 + KV（功能开关）+ Turnstile + 每小时一次 Cron。结构对应第三讲的 API 和第四讲的表，运行时换成 Worker。

**已有 Docker 和 PostgreSQL。** 计算留在第五讲的机器上，用 Tunnel 把域名接进去；如果希望 API 跑在边缘，用 Hyperdrive 连原来的库。两套主库不要并行写。

## 20. 免费额度速查（2026-10）

超出免费档的当日上限后，对应操作失败，到 UTC 0 点恢复。静态资源请求、R2 出口流量不在此列。

| 产品 | 免费档 | 超出之后 |
| --- | --- | --- |
| Workers 请求 | 10 万次 / 天 | 失败。付费：每月含 1000 万次，之后 $0.30 / 百万次 |
| Workers CPU | 每次 10 毫秒 | 调用失败。付费：每月含 3000 万毫秒 |
| 静态资源请求 | 免费，不限次数 | — |
| Workers Logs | 20 万条 / 天，留 3 天 | 2026-12-01 起改 Observability 定价 |
| KV | 读 10 万 / 天，写 1000 / 天，1 GB | 该类操作失败 |
| D1 | 读 500 万行 / 天，写 10 万行 / 天，5 GB，10 个库 | 查询失败 |
| R2 标准存储 | 10 GB、A 类 100 万 / 月、B 类 1000 万 / 月，出口免费 | 按量。低频存储无免费档 |
| Hyperdrive | 10 万次查询 / 天 | 查询失败 |
| Queues | 1 万次操作 / 天，保留 24 小时 | 操作失败 |
| Workflows | 3000 步 / 天 | 步骤失败 |
| Email Routing | 免费计划可用 | 转发给已验证邮箱 |
| Email Sending | 发给已验证地址可用 | 任意收件人要付费计划，产品仍是 Beta |

定价页：[Workers](https://developers.cloudflare.com/workers/platform/pricing/)、[D1](https://developers.cloudflare.com/d1/platform/pricing/)、[R2](https://developers.cloudflare.com/r2/pricing/)、[KV](https://developers.cloudflare.com/kv/platform/pricing/)。

## 21. 踩坑

| 现象 | 处理 |
| --- | --- |
| 源站被扫到真实 IP | 网站记录用橙色云；机器只接受来自 Tunnel 或你自己的入口 |
| 免费 Worker 上登录接口 CPU 超限 | bcrypt 这类哈希不要放在 10 毫秒 CPU 里 |
| 用户看到别人的页面 | 登录后的响应不要进公共缓存 |
| D1 很快撞上读取上限 | 看 `meta.rows_read`，给过滤条件加索引 |
| KV 读到旧配置 | 开关可以；余额和库存改去 D1 |
| 预览环境改坏了生产数据 | 先确认绑定是预览副本还是生产库 |
| 回滚后数据没回去 | 回滚只覆盖 Worker 代码 |
| 邮件进垃圾箱 | Routing 只负责收；对外发信要配 SPF / DKIM / DMARC |
| 表单仍被脚本刷 | token 要在 Worker 里调用 siteverify |

## 22. 自测清单

用免费账号做一遍，不需要新的 demo 目录。

1. `pnpm create cloudflare@latest` 创建一个带 React 的项目，`wrangler dev` 能打开页面。
2. 加 `GET /api/health`，`run_worker_first` 包含 `/api/*`，页面路由仍返回前端。
3. 建一个 D1，写入并按主键读出一行。故意对无索引列做一次全表过滤，看 `rows_read`。
4. 建一个 R2 桶，上传一个文件再取回。桶不对公网开放写权限。
5. 用 KV 存一个功能开关。
6. `TURNSTILE_SECRET` 放进 `.dev.vars` 和 `wrangler secret`，登录接口在验证失败时返回 400。
7. 加一个每小时执行的 Cron，只删过期会话或写一条日志。
8. 把 `hello@你的域名` 转到自己的邮箱，收到一封测试信。
9. 部署之后在 Workers Logs 里找到 `/api/health` 的日志。
10. 对照第 20 节，写下这个项目会先撞上哪一个免费额度。

官方目录：<https://developers.cloudflare.com/directory/>
