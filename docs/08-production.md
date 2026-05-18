# 第八讲：生产实战与可观测性

> 写完代码只是开始，保障线上稳定运行才是终点。

## 写在前面：从"前端思维"到"生产思维"

如果你是前端工程师，你对"上线"的认知可能是这样的：

```
代码写完 → npm run build → 丢到服务器 → 搞定了！
```

然后你发现：

- 凌晨两点，老板打电话："页面打不开了！"
- 上午十点，产品群里炸了："用户反馈数据丢了！"
- 下午三点，运维找你："你的服务把内存吃满了。"

**实际情况是：代码上线只是开始，80% 的工作是保障它稳定运行。**

### 一个类比

写完代码就像**开了一家餐厅**。开业那天很兴奋，但真正的挑战是：

- 每天按时开门营业（服务可用性）
- 菜品质量稳定（功能正确性）
- 客人不用等太久（性能）
- 厨房不着火（安全与异常处理）
- 客人投诉了能快速处理（故障排查与恢复）

你以前只负责"把菜谱写好"（前端页面），现在要负责"让整个餐厅运转起来"。

### 线上 Bug ≠ 本地 Bug

本地出了 Bug，你 F12 打开 DevTools 看看，改改代码，刷新一下就好了。

线上出了 Bug：

- 你看不到用户的浏览器
- 你不知道是哪个版本的代码
- 你不知道是不是只有部分用户受影响
- 你的修复要经过构建、测试、部署才能生效
- 每多一分钟，就多一批用户受到影响

**这就是为什么我们需要：日志、监控、报警、健康检查、灰度发布……这些"看起来跟前端没关系"的东西。**

---

## 1. 你需要掌握的 Linux 基础命令

作为前端同学，你可能只用过 `cd` 和 `ls`。但当你第一次 SSH 到服务器上排查问题时，你需要更多"武器"。

### 1.1 必备命令速查表

| 命令 | 用途 | 示例 |
|------|------|------|
| ssh | 连接远程服务器 | `ssh root@1.2.3.4` |
| top / htop | 查看 CPU 和内存使用 | `top` |
| df -h | 查看磁盘使用 | `df -h` |
| free -h | 查看内存使用 | `free -h` |
| tail -f | 实时查看日志 | `tail -f /var/log/app.log` |
| grep | 在日志中搜索关键词 | `grep "ERROR" app.log` |
| curl | 测试 API 是否可达 | `curl http://localhost:8080/health` |
| netstat / ss | 查看端口占用 | `ss -tlnp` |
| systemctl | 管理服务 | `systemctl status nginx` |
| journalctl | 查看系统日志 | `journalctl -u myapp -f` |

### 1.2 真实场景举例

**场景 1：上线后服务没启动，排查端口占用**

```bash
# 看看 3000 端口被谁占了
ss -tlnp | grep 3000
# 输出：LISTEN 0 128 *:3000 *:* users:(("node",pid=1234,fd=18))

# 看看这个进程是什么
ps aux | grep 1234

# 如果是旧版本没退出，kill 掉
kill 1234
```

**场景 2：用户报告"接口返回 500"，快速确认**

```bash
# 先看接口是否能通
curl -v http://localhost:8080/api/users

# 看最近的错误日志
tail -100 /var/log/app.log | grep "ERROR"

# 实时跟踪日志，然后请同事再触发一次
tail -f /var/log/app.log
```

**场景 3：服务器变慢，排查资源瓶颈**

```bash
# 看 CPU 和内存总览
top
# 按 M 键按内存排序，按 P 键按 CPU 排序

# 看磁盘是不是满了
df -h
# 输出 Use% 如果到了 90% 以上就危险了

# 看内存详情
free -h
```

**场景 4：Docker 容器里的日志查看**

```bash
# 看容器是否在运行
docker ps

# 看容器日志（最近 100 行）
docker logs --tail 100 my-app

# 实时跟踪容器日志
docker logs -f my-app

# 进入容器内部排查
docker exec -it my-app sh
```

---

## 2. 健康检查（Health Check）详解

### 2.1 什么是健康检查

健康检查就是给你的服务做"体检"——定期（通常每隔几秒）检查一下服务是否还活着、是否能正常工作。

**为什么需要？**

- 负载均衡器需要知道哪台服务器能用，自动把流量切走
- Kubernetes / Docker 需要知道容器是否卡死了，自动重启
- 监控系统需要在服务挂掉时立即报警

### 2.2 三种级别的健康检查

```
┌──────────────────────────────────────────────────────┐
│                    健康检查级别                         │
├───────────────┬──────────────┬───────────────────────┤
│  存活检查     │  就绪检查    │  启动检查             │
│  Liveness     │  Readiness   │  Startup              │
├───────────────┼──────────────┼───────────────────────┤
│  "你还活着吗" │  "你能干活吗"│  "你准备好了吗"       │
├───────────────┼──────────────┼───────────────────────┤
│  进程在跑     │  能处理请求  │  初始化完成           │
│  → 死了就重启 │  → 没好就不  │  → 没好就等着         │
│               │    给你分流量│                       │
└───────────────┴──────────────┴───────────────────────┘
```

### 2.3 完整的健康检查端点实现

```ts
router.get('/health', async (req, res) => {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }

  try {
    await db.execute(sql`SELECT 1`)
    checks.database = 'healthy'
  } catch {
    checks.database = 'unhealthy'
  }

  try {
    await redis.ping()
    checks.redis = 'healthy'
  } catch {
    checks.redis = 'unhealthy'
  }

  const isHealthy = checks.database === 'healthy' && checks.redis === 'healthy'
  res.status(isHealthy ? 200 : 503).json(checks)
})
```

返回示例（一切正常时）：

```json
{
  "database": "healthy",
  "redis": "healthy",
  "uptime": 86400,
  "memory": {
    "rss": 67108864,
    "heapTotal": 35651584,
    "heapUsed": 28311552,
    "external": 1245678
  }
}
```

### 2.4 Docker 中配置健康检查

```yaml
services:
  app:
    image: my-app:latest
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8080/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## 3. 日志体系设计与查询

### 3.1 如何读懂服务器日志

前端同学第一次 SSH 到服务器看日志，可能会看到这样的东西：

```json
{"level":30,"time":1716019200000,"pid":1234,"hostname":"prod-1","requestId":"abc-123","method":"GET","url":"/api/users","statusCode":200,"duration":45,"msg":"request completed"}
```

别慌，我们拆解一下：

```
┌─────────────────────────────────────────────────────────────────────┐
│  一条完整的请求日志拆解                                               │
├─────────────────┬───────────────────────────────────────────────────┤
│  level: 30      │  日志级别（30=INFO，40=WARN，50=ERROR）            │
│  time: 17160... │  时间戳（毫秒）                                    │
│  requestId      │  请求唯一 ID，排查问题的"线索"                      │
│  method + url   │  哪个接口                                          │
│  statusCode     │  响应状态码                                        │
│  duration: 45   │  耗时 45ms                                        │
│  msg            │  人类可读的描述                                     │
└─────────────────┴───────────────────────────────────────────────────┘
```

**关键技巧：用 requestId 串起一个请求的完整生命周期。** 一个请求可能产生多条日志（进入 → 查数据库 → 调第三方 → 返回），它们都带着同一个 requestId。

### 3.2 日志分级

| 级别  | 用途                                   | 示例                           |
| ----- | -------------------------------------- | ------------------------------ |
| ERROR | 影响功能的错误                         | 数据库连接失败、支付失败       |
| WARN  | 潜在问题，暂不影响功能                 | 重试成功、缓存未命中           |
| INFO  | 关键业务事件                           | 用户登录、订单创建             |
| DEBUG | 开发调试信息（生产环境一般关闭）       | 请求参数、SQL 语句             |

**使用时机：**

- ERROR：出了问题，需要人介入处理
- WARN：有点不对，但系统自己兜住了
- INFO：一切正常，记录关键事件
- DEBUG：出问题时临时开启，帮助排查

### 3.3 结构化日志

```ts
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
})

// 请求日志中间件
function requestLogger(req, res, next) {
  const start = Date.now()
  const requestId = crypto.randomUUID()
  req.requestId = requestId

  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    })
  })

  next()
}
```

### 3.4 业务日志

```ts
// 带上下文的日志
const orderLogger = logger.child({ module: 'order' })

async function createOrder(userId: string, items: OrderItem[]) {
  orderLogger.info({ userId, itemCount: items.length }, 'Creating order')

  try {
    const order = await db.transaction(async (tx) => {
      // ... 创建订单逻辑
    })
    orderLogger.info({ orderId: order.id, userId }, 'Order created successfully')
    return order
  } catch (error) {
    orderLogger.error({ userId, error: error.message }, 'Failed to create order')
    throw error
  }
}
```

### 3.5 从日志中找到问题根因

假设用户反馈"下单失败"，你拿到了他的请求 ID `abc-123`：

```bash
# 在日志文件中搜索这个请求 ID
grep "abc-123" /var/log/app.log

# 输出（时间顺序）：
# {"requestId":"abc-123","msg":"Creating order","userId":"user-456"}
# {"requestId":"abc-123","msg":"Checking inventory","productId":"prod-789"}
# {"requestId":"abc-123","level":50,"msg":"Failed to create order","error":"connection timeout"}
```

看到了！`connection timeout`——数据库连接超时。接下来就去查数据库状态。

---

## 4. 前端错误监控（Sentry）

作为前端同学，这个部分你应该最熟悉——前端页面上的 JS 报错怎么监控？用户遇到白屏了你怎么知道？

### 4.1 为什么需要前端错误监控

- 用户不会主动告诉你"页面报错了"，他们只会说"用不了"然后走了
- `console.error` 只有你自己打开 F12 才看得到
- 线上的错误环境千差万别（各种浏览器、各种网络、各种设备）

### 4.2 Sentry 前端接入

```ts
// main.ts
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: 'https://xxx@sentry.io/123',
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0
})
```

### 4.3 Sentry 后端接入（Node.js）

```ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: 'https://xxx@sentry.io/456',
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  tracesSampleRate: 0.2
})

// Express 中使用
app.use(Sentry.expressErrorHandler())
```

### 4.4 Source Map 上传

线上代码是压缩过的，报错堆栈看不懂。上传 Source Map 后 Sentry 能自动映射回源码行号。

```bash
# 构建时生成 source map
vite build --sourcemap

# 上传到 Sentry
npx @sentry/cli sourcemaps upload \
  --org my-org \
  --project my-project \
  --release 1.0.0 \
  ./dist
```

**注意：上传完之后要把 `.map` 文件从部署产物中删除，不要让用户能访问到。**

### 4.5 错误分组与报警

Sentry 会自动把相同的错误归为一组（Issue），你可以配置：

- 错误数量超过 N 次 → 发送钉钉/飞书通知
- 新出现的错误类型 → 立即通知
- 某个错误影响了 > 1% 的用户 → 升级为 P0

---

## 5. 监控、Trace 与报警

### 5.1 应用指标（Metrics）

监控的核心问题是：**我的服务现在怎么样？** 通过采集一系列"指标"来回答这个问题。

```ts
// 关键业务指标
interface AppMetrics {
  httpRequestDuration: Histogram    // 请求耗时分布
  httpRequestTotal: Counter         // 请求总数（按 method/status/path 分组）
  activeConnections: Gauge          // 当前活跃连接数
  dbQueryDuration: Histogram        // 数据库查询耗时
  cacheHitRate: Gauge               // 缓存命中率
  orderCreatedTotal: Counter        // 订单创建数
  errorTotal: Counter               // 错误总数
}
```

三种指标类型解释：

- **Counter（计数器）**：只能增加，比如"一共收到了多少请求"
- **Gauge（仪表盘）**：可增可减，比如"当前有多少活跃连接"
- **Histogram（直方图）**：分布统计，比如"95% 的请求在多少毫秒内完成"

### 5.2 使用 Prometheus 格式暴露指标

Prometheus 是业界最流行的监控数据采集方案。你的应用暴露一个 `/metrics` 端点，Prometheus 定时来拉取。

```ts
import { collectDefaultMetrics, register, Histogram, Counter } from 'prom-client'

collectDefaultMetrics()

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
})

const httpTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
})

function metricsMiddleware(req, res, next) {
  const end = httpDuration.startTimer()
  res.on('finish', () => {
    const route = req.route?.path || req.url
    const labels = { method: req.method, route, status: res.statusCode }
    end(labels)
    httpTotal.inc(labels)
  })
  next()
}

// 暴露 /metrics 端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

### 5.3 分布式 Trace

当你的系统有多个微服务时，一个请求可能经过 A → B → C 三个服务。Trace 帮你把整条链路串起来。

```ts
// 请求链路追踪
function traceMiddleware(req, res, next) {
  const traceId = req.headers['x-trace-id'] || crypto.randomUUID()
  const spanId = crypto.randomUUID()

  req.traceId = traceId
  req.spanId = spanId
  res.setHeader('x-trace-id', traceId)

  next()
}

// 下游请求传递 traceId
async function callDownstream(url: string, traceId: string) {
  return fetch(url, {
    headers: { 'x-trace-id': traceId }
  })
}
```

### 5.4 报警规则

监控数据有了，接下来要设置"什么情况下通知我"。

```yaml
# Grafana 报警规则示例
groups:
  - name: app-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'Error rate > 5% for 2 minutes'

      - alert: SlowRequests
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'P95 latency > 2s for 5 minutes'
```

翻译成人话：

- **HighErrorRate**：5 分钟内错误率 > 5%，持续 2 分钟 → 严重告警
- **SlowRequests**：95% 的请求耗时 > 2 秒，持续 5 分钟 → 警告

---

## 6. 性能排查：内存、CPU、慢查询、连接数

### 6.1 Node.js 内存排查

```ts
// 内存使用监控
function logMemoryUsage() {
  const used = process.memoryUsage()
  logger.info({
    rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(used.external / 1024 / 1024)} MB`
  }, 'Memory usage')
}

setInterval(logMemoryUsage, 60000)
```

```bash
# 生成堆快照
node --inspect app.js
# Chrome DevTools → chrome://inspect → 远程调试
```

### 6.2 慢查询排查

```sql
-- PostgreSQL 开启慢查询日志
ALTER SYSTEM SET log_min_duration_statement = 200;  -- 200ms 以上记录
SELECT pg_reload_conf();

-- 查看当前执行中的查询
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '1 second'
ORDER BY duration DESC;

-- 查看表的统计信息
SELECT relname, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;
```

### 6.3 连接池管理

```ts
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  onnotice: () => {}
})

// 连接池状态监控
setInterval(async () => {
  logger.info({
    totalConnections: sql.connections.open,
    idleConnections: sql.connections.idle,
    pendingConnections: sql.connections.pending
  }, 'DB connection pool status')
}, 30000)
```

---

## 7. 缓存策略：Redis / 本地缓存

### 7.1 Redis 基础操作

```ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// 字符串缓存
async function getCachedUser(userId: string) {
  const cached = await redis.get(`user:${userId}`)
  if (cached) return JSON.parse(cached)

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (user) {
    await redis.setex(`user:${userId}`, 3600, JSON.stringify(user))
  }
  return user
}

// 缓存失效
async function invalidateUserCache(userId: string) {
  await redis.del(`user:${userId}`)
}
```

### 7.2 缓存模式

```ts
// Cache-Aside（旁路缓存）—— 最常用
async function getWithCache<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key)
  if (cached) return JSON.parse(cached)

  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  return data
}

// 防缓存穿透（空值缓存）
async function getWithNullCache<T>(key: string, ttl: number, fetcher: () => Promise<T | null>) {
  const cached = await redis.get(key)
  if (cached === 'NULL') return null
  if (cached) return JSON.parse(cached)

  const data = await fetcher()
  if (data === null) {
    await redis.setex(key, 60, 'NULL')
  } else {
    await redis.setex(key, ttl, JSON.stringify(data))
  }
  return data
}
```

---

## 8. 限流、超时、降级与熔断

### 8.1 请求限流

为什么要限流？想象你的餐厅只有 50 个座位，突然来了 500 人。不限流的话，所有人都吃不上饭（服务崩溃）。限流让前 50 人正常吃，后面的排队。

```ts
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
})

app.use('/api/', apiLimiter)

// 更精细的限流：基于用户
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip
})
```

### 8.2 请求超时

```ts
function timeout(ms: number) {
  return (req, res, next) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({ error: 'Request timeout' })
      }
    }, ms)

    res.on('finish', () => clearTimeout(timer))
    next()
  }
}

app.use('/api/', timeout(30000))
```

### 8.3 熔断器模式

熔断器的灵感来自电路中的保险丝：当下游服务故障时，与其每个请求都等超时再失败，不如直接"断开"，快速返回错误，等下游恢复后再"合上"。

```
正常状态 (Closed)          故障状态 (Open)         半开状态 (Half-Open)
    │                          │                        │
    │  连续失败 ≥ 阈值         │  等待超时后            │  试探请求
    │ ─────────────────→      │ ─────────────────→     │
    │                          │                        │
    │                          │  快速失败，不调下游     │  成功 → 恢复 Closed
    │  ←─────────────────────────────────────────────── │  失败 → 回到 Open
```

```ts
class CircuitBreaker {
  private failures = 0
  private lastFailure = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 30000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure() {
    this.failures++
    this.lastFailure = Date.now()
    if (this.failures >= this.threshold) {
      this.state = 'open'
    }
  }
}

const paymentBreaker = new CircuitBreaker(3, 60000)

async function processPayment(order: Order) {
  return paymentBreaker.execute(() => paymentGateway.charge(order))
}
```

---

## 9. 灰度发布与回滚

### 9.1 灰度策略

新功能不要一次性放给所有用户——万一有 Bug 就全炸了。先放给 10% 的用户试试，没问题再逐步放量。

```ts
// 基于用户 ID 的灰度
function isInGrayGroup(userId: string, percentage: number): boolean {
  const hash = crypto.createHash('md5').update(userId).digest('hex')
  const num = parseInt(hash.slice(0, 8), 16)
  return num % 100 < percentage
}

// 在中间件中使用
function grayMiddleware(req, res, next) {
  const userId = req.user?.id
  req.features = {
    newCheckout: userId ? isInGrayGroup(userId, 10) : false,
    aiRecommend: userId ? isInGrayGroup(userId, 30) : false
  }
  next()
}
```

### 9.2 快速回滚

如果灰度发现问题，第一时间回滚而不是现场修 Bug。

```bash
# Docker 回滚到上一个版本
docker-compose pull
docker-compose up -d

# 或指定版本标签
docker-compose -f docker-compose.yml -f docker-compose.rollback.yml up -d

# Git 回滚部署
git revert HEAD
git push origin main
# CI/CD 自动部署
```

---

## 10. 一次线上故障的完整排查过程（实战故事）

### 场景：周五下午 2 点，用户反馈"页面打不开了"

让我们走一遍完整的排查流程：

```
用户报告 "页面打不开"
        │
        ▼
┌─────────────────────────┐
│  Step 1: 确认问题范围    │
│  所有用户？部分用户？    │
│  哪个页面？什么时候开始？│
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 2: 检查前端        │
│  CDN 正常吗？           │
│  Chrome DevTools 网络tab │
│  → 如果静态资源 404     │
│    → CDN / 部署问题     │
│  → 如果 API 返回 500    │
│    → 后端问题，往下查   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 3: 检查 API        │
│  curl 测试接口           │
│  → 能通但慢 → 性能问题  │
│  → 返回 500 → 后端报错  │
│  → 连接超时 → 服务挂了  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 4: 检查后端日志    │
│  ssh 到服务器            │
│  docker logs / tail -f   │
│  搜索 ERROR 关键词       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 5: 检查数据库      │
│  连接是否正常？         │
│  有没有慢查询？         │
│  连接池是否用尽？       │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Step 6: 修复 + 验证     │
│  Kill 慢查询 / 重启服务  │
│  验证恢复               │
│  写故障复盘             │
└─────────────────────────┘
```

### 实际排查命令

```bash
# Step 2: 确认 CDN（从自己电脑）
curl -I https://cdn.example.com/static/app.js
# 看 HTTP 状态码，200 就没问题

# Step 3: 测接口
curl -w "\nHTTP Code: %{http_code}\nTime: %{time_total}s\n" \
  https://api.example.com/api/users
# 输出 HTTP Code: 500, Time: 0.032s → 后端报错了

# Step 4: SSH 到服务器看日志
ssh deploy@prod-server
docker logs --tail 200 my-app | grep "ERROR"
# 输出：ERROR: connection pool exhausted

# Step 5: 查数据库
docker exec -it postgres psql -U myuser -d mydb
# 在 psql 里：
SELECT count(*) FROM pg_stat_activity;
-- 输出：20（全满了！）

SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity WHERE state = 'active'
ORDER BY duration DESC LIMIT 5;
-- 发现一个跑了 10 分钟的查询

# Step 6: Kill 慢查询
SELECT pg_terminate_backend(12345);
-- 服务立即恢复
```

---

## 11. 故障复盘模板

每次故障修复后，都要写一份复盘文档。这不是为了追责，而是为了防止同样的问题再次发生。

```markdown
## 故障复盘

- **故障时间：** 2026-05-18 14:00 ~ 14:30
- **影响范围：** 全部用户无法访问
- **根因：** 数据库连接池用尽，因为一个慢查询阻塞了所有连接
- **修复措施：** Kill 慢查询 + 增加连接池上限 + 添加查询超时
- **预防措施：**
  1. 添加慢查询告警（超过 5s 的查询自动报警）
  2. 连接池使用率超过 80% 告警
  3. 所有查询添加超时限制（30s）
- **时间线：**
  - 14:00 用户报告无法访问
  - 14:05 值班同学确认 API 返回 500
  - 14:10 查看日志发现 "connection pool exhausted"
  - 14:15 发现慢查询并 kill
  - 14:20 服务恢复
  - 14:30 确认全部恢复正常
```

**复盘的核心精神：对事不对人，重点是"如何避免再次发生"。**

---

## 12. 云产品基础

### 12.1 常用云产品

| 产品      | 用途               | 阿里云               | 腾讯云           |
| --------- | ------------------ | -------------------- | ---------------- |
| 云服务器  | 应用部署           | ECS                  | CVM              |
| 对象存储  | 静态资源、文件上传 | OSS                  | COS              |
| CDN       | 静态资源加速       | CDN                  | CDN              |
| 负载均衡  | 流量分发           | SLB                  | CLB              |
| WAF       | Web 应用防火墙     | WAF                  | WAF              |
| 数据库    | 托管数据库         | RDS (PostgreSQL)     | TDSQL            |
| Redis     | 缓存               | Redis                | Redis            |
| 日志      | 日志采集与分析     | SLS                  | CLS              |
| 监控      | 基础设施监控       | CloudMonitor         | 云监控           |

### 12.2 OSS / COS 基础使用

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: 'oss-cn-hangzhou',
  endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
  credentials: {
    accessKeyId: process.env.OSS_ACCESS_KEY!,
    secretAccessKey: process.env.OSS_SECRET_KEY!
  }
})

async function uploadToOSS(key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: 'my-app-assets',
      Key: key,
      Body: body,
      ContentType: contentType
    })
  )
  return `https://my-app-assets.oss-cn-hangzhou.aliyuncs.com/${key}`
}
```

### 12.3 基础排障清单

| 问题         | 排查思路                                          |
| ------------ | ------------------------------------------------- |
| 服务不可达   | 安全组 → SLB 健康检查 → 容器状态 → 端口监听      |
| 响应慢       | CDN 命中率 → 数据库慢查询 → 应用日志 → CPU/内存   |
| 502/504      | Nginx 配置 → 上游服务存活 → 超时设置              |
| 磁盘满       | `df -h` → 清理日志 → 扩容                        |
| 数据库连接满 | 连接池配置 → 慢查询 → 长事务 → 连接数限制        |

---

## 13. 课堂练习

### 练习 8：为应用接入日志 + 监控 + 报警

**目标：** 为前几讲开发的全栈应用接入完整的可观测性体系。

**要求：**

1. 结构化日志：使用 pino，包含 requestId、模块名、业务上下文
2. Prometheus 指标：请求耗时、错误率、数据库查询耗时
3. 健康检查端点：`GET /health`，检查数据库和 Redis 连接
4. 缓存层：为高频查询接入 Redis 缓存
5. 限流：API 接口限流
6. docker-compose 集成 Grafana + Prometheus

**docker-compose 追加服务：**

```yaml
prometheus:
  image: prom/prometheus
  ports:
    - '9090:9090'
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - '3001:3000'
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

**验证标准：**

- [ ] 日志输出为 JSON 格式，包含 requestId
- [ ] `/metrics` 端点返回 Prometheus 格式指标
- [ ] `/health` 端点正确反映依赖服务状态
- [ ] Redis 缓存生效，命中时响应更快
- [ ] 超过限流阈值返回 429
- [ ] Grafana Dashboard 可展示请求量与错误率

**参考代码：** 见 [demos/08-observability](../demos/08-observability)
