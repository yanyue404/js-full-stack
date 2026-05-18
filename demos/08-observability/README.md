# 练习 8：为应用接入日志 + 监控 + 报警

为前几讲开发的全栈应用接入完整的可观测性体系。

## 目标

掌握生产环境核心运维能力：结构化日志、Prometheus 指标采集、Grafana 可视化、Redis 缓存、健康检查、限流、前端错误监控。

## 要求

1. 结构化日志：使用 pino，包含 requestId、模块名、业务上下文
2. Prometheus 指标：请求耗时、错误率、数据库查询耗时
3. 健康检查端点：`GET /health`，检查数据库和 Redis 连接
4. 缓存层：为高频查询接入 Redis 缓存
5. 限流：API 接口限流
6. docker-compose 集成 Grafana + Prometheus

## 快速开始

```bash
# 在现有的全栈项目 api/ 目录下操作
cd api

# 安装可观测性相关依赖
pnpm add pino pino-pretty ioredis prom-client express-rate-limit

# 安装前端错误监控（在 web/ 目录）
cd ../web
pnpm add @sentry/react
```

## 项目结构（在现有项目基础上新增）

```
fullstack-app/
├── api/
│   └── src/
│       ├── lib/
│       │   ├── logger.ts          # pino 日志实例
│       │   ├── redis.ts           # Redis 客户端
│       │   └── metrics.ts         # Prometheus 指标定义
│       ├── middleware/
│       │   ├── requestLogger.ts   # 请求日志中间件
│       │   ├── metricsCollector.ts # 指标采集中间件
│       │   └── rateLimiter.ts     # 限流中间件
│       └── routes/
│           ├── health.ts          # 健康检查端点
│           └── metrics.ts         # /metrics 端点
├── web/
│   └── src/
│       └── lib/
│           └── sentry.ts          # Sentry 初始化
├── prometheus/
│   └── prometheus.yml             # Prometheus 采集配置
├── grafana/
│   └── dashboards/
│       └── app.json               # 预置 Dashboard
└── docker-compose.yml             # 追加 Prometheus + Grafana + Redis
```

## docker-compose 追加服务

```yaml
# 在现有 docker-compose.yml 中追加
services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 3s
      retries: 5

  prometheus:
    image: prom/prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    depends_on:
      - api

  grafana:
    image: grafana/grafana
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - prometheus
```

## Prometheus 配置

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['api:8080']
    metrics_path: '/metrics'
```

## 需要实现的模块

### 模块 1：结构化日志

```ts
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // 开发环境美化输出，生产环境 JSON 格式
})

// 使用：logger.info({ userId, orderId }, 'Order created')
// 输出：{"level":30,"time":1716048000000,"userId":"123","orderId":"456","msg":"Order created"}
```

### 模块 2：健康检查

```ts
// routes/health.ts
// GET /health → 检查 DB + Redis → 返回 200 或 503
```

### 模块 3：Redis 缓存

```ts
// 对用户详情接口做缓存
// GET /api/users/:id → 先查 Redis → 未命中查 DB → 写入 Redis（TTL 1 小时）
// PATCH /api/users/:id → 更新 DB → 清除 Redis 缓存
```

### 模块 4：Prometheus 指标

```ts
// lib/metrics.ts
// 定义指标：http_request_duration_seconds、http_requests_total、db_query_duration_seconds
// GET /metrics → 返回 Prometheus 格式的指标数据
```

### 模块 5：限流

```ts
// middleware/rateLimiter.ts
// 全局限流：100 次/分钟
// 登录接口：20 次/15分钟（防暴力破解）
```

## 操作步骤

```bash
# 1. 启动所有服务
docker-compose up -d --build

# 2. 验证健康检查
curl http://localhost/api/health

# 3. 发送一些请求产生指标数据
for i in {1..50}; do curl -s http://localhost/api/users > /dev/null; done

# 4. 查看 Prometheus
# 浏览器打开 http://localhost:9090
# 查询：http_requests_total

# 5. 查看 Grafana
# 浏览器打开 http://localhost:3001
# 账号：admin / admin
# 添加数据源：Prometheus → URL: http://prometheus:9090
# 导入 Dashboard 或手动创建面板

# 6. 测试限流
for i in {1..120}; do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost/api/users
done
# 超过 100 次后应返回 429

# 7. 测试缓存
# 第一次请求（查 DB，较慢）
time curl http://localhost/api/users/some-id
# 第二次请求（命中 Redis，更快）
time curl http://localhost/api/users/some-id
```

## 验证标准

- [ ] 日志输出为 JSON 格式，包含 requestId（每条日志可追溯到具体请求）
- [ ] `GET /health` 正确反映 DB 和 Redis 的连接状态
- [ ] `GET /metrics` 返回 Prometheus 格式指标
- [ ] Prometheus 页面（:9090）能查询到 `http_requests_total` 指标
- [ ] Grafana 页面（:3001）能展示请求量和错误率图表
- [ ] Redis 缓存生效（第二次请求明显更快，或通过日志看到 cache hit）
- [ ] 超过限流阈值返回 429 Too Many Requests
- [ ] 开发环境日志美化输出（pino-pretty），生产环境 JSON 格式

## 提示

- pino 的 `child` 方法可以创建带固定上下文的子 logger：`logger.child({ module: 'order' })`
- Prometheus 的 Histogram 用于记录耗时分布，Counter 用于计数，Gauge 用于当前值
- Redis 缓存的 key 设计：`entity:id`，如 `user:abc-123`
- 限流器的 `keyGenerator` 参数可以按用户 ID 或 IP 做不同粒度的限流
- Grafana 内置了 Prometheus 数据源支持，添加后可直接写 PromQL 查询
- 健康检查应该尽量轻量，不要做复杂查询
