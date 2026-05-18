# 第五讲：Docker 与部署运维

> 能独立搭建开发环境，完成从本地到线上的全流程部署。

## 写在前面：为什么前端工程师要学 Docker

### "我电脑上能跑啊"

每个程序员都经历过这个经典场景：

```
你：    "这个 bug 我本地复现不了啊"
后端：  "我这边也是好的"
测试：  "线上就是挂了"
运维：  "你们用的什么 Node 版本？"
你：    "......18？还是 16？我 nvm 切过来切过去的"
```

这不是段子，这是真实的运维灾难。问题的根源很简单——**环境不一致**：

| 差异来源         | 举例                                           |
| ---------------- | ---------------------------------------------- |
| Node.js 版本    | 你用 20，同事用 18，CI 上是 16                  |
| 操作系统         | 你用 Windows，服务器是 Linux                    |
| 数据库版本       | 本地 PostgreSQL 16，生产是 14                   |
| 系统依赖         | 某些 npm 包需要 python、gcc 编译                |
| 环境变量         | 本地有 .env，服务器上忘记配了                   |

### Docker 解决了什么

**一句话：环境即代码，一次配置到处运行。**

类比前端的世界：

| 前端工具         | Docker 对应           | 解决的问题                     |
| ---------------- | --------------------- | ------------------------------ |
| package.json     | Dockerfile            | 声明"需要什么"                 |
| node_modules     | 镜像层（layers）      | 安装好的依赖                   |
| npm install      | docker build          | 把声明变成可运行的东西         |
| npm start        | docker run            | 跑起来                         |
| .nvmrc           | FROM node:20          | 锁定运行时版本                 |
| monorepo         | docker-compose        | 编排多个服务协同运行           |

你写了一个 `Dockerfile`，无论在你的 Mac、同事的 Windows、还是阿里云的 Linux 服务器上，`docker build` + `docker run` 出来的东西**完全一样**。

## 1. Docker 心智模型

### 1.1 镜像 vs 容器

这是 Docker 最核心的概念，用前端的类比来理解：

```
镜像 (Image)          容器 (Container)
─────────────         ─────────────────
类 (class)      →     实例 (new Class())
React 组件定义  →     组件渲染后的 DOM
.docx 模板      →     打印出来的纸质文件
```

**镜像**是只读的模板，包含运行应用所需的一切（代码、依赖、OS 工具）。
**容器**是镜像的运行实例，有自己的进程、网络、文件系统。

一个镜像可以启动多个容器，就像一个 Class 可以 new 出多个实例。

### 1.2 Dockerfile → 构建镜像的"配方"

```
┌─────────────────────────────────────────────────┐
│  Dockerfile（构建配方）                          │
│                                                  │
│  FROM node:20-alpine    ← 基础镜像（选择基座）  │
│  WORKDIR /app           ← 设定工作目录          │
│  COPY package.json .    ← 复制依赖声明          │
│  RUN pnpm install       ← 安装依赖              │
│  COPY . .               ← 复制源代码            │
│  RUN pnpm build         ← 构建产物              │
│  EXPOSE 8080            ← 声明端口              │
│  CMD ["node", "dist/index.js"]  ← 启动命令      │
│                                                  │
└──────────────────────┬──────────────────────────┘
                       │ docker build
                       ▼
┌─────────────────────────────────────────────────┐
│  镜像 myapp:latest                               │
│  ┌──────────────────────────────────┐           │
│  │ Layer 7: CMD                     │ ← 每条    │
│  │ Layer 6: EXPOSE                  │   指令    │
│  │ Layer 5: COPY . .                │   生成    │
│  │ Layer 4: RUN pnpm build          │   一层    │
│  │ Layer 3: RUN pnpm install        │           │
│  │ Layer 2: COPY package.json       │           │
│  │ Layer 1: FROM node:20-alpine     │           │
│  └──────────────────────────────────┘           │
└──────────────────────┬──────────────────────────┘
                       │ docker run
                       ▼
┌─────────────────────────────────────────────────┐
│  容器（运行中的实例）                            │
│  PID: 1  node dist/index.js                     │
│  网络: 172.17.0.2:8080                          │
│  文件系统: 可写层 + 只读镜像层                   │
└─────────────────────────────────────────────────┘
```

**分层缓存原理：** Docker 按行缓存每一层。如果某一层的输入没变，就直接用缓存。这就是为什么要**先 COPY package.json，后 COPY 源码**——只要依赖没变，`pnpm install` 那层就走缓存，极大加速构建。

### 1.3 端口映射

容器有自己的网络空间，默认外界无法访问。`-p` 参数建立主机与容器之间的端口映射：

```
-p 3000:8080 的含义：

┌──────────────────┐          ┌──────────────────┐
│   你的电脑        │          │   容器内部        │
│                  │          │                  │
│  localhost:3000 ─┼──映射──→─┼─ 0.0.0.0:8080   │
│                  │          │                  │
│  浏览器访问 3000  │          │  Node 监听 8080  │
└──────────────────┘          └──────────────────┘

格式：-p <主机端口>:<容器端口>
```

类比：就像 Vite 的 `proxy` 配置——你访问 `localhost:5173/api`，它帮你转发到 `localhost:8080/api`。端口映射也是"前门"和"后门"的关系。

### 1.4 Volume（数据卷）

容器是**临时的**——删除容器，里面的数据就没了。Volume 让数据独立于容器存活：

```
没有 Volume：                     有 Volume：
┌─────────────┐                  ┌─────────────┐
│  容器 A      │                  │  容器 A      │
│  /data ──────┼── 删容器后消失   │  /data ──────┼──┐
└─────────────┘                  └─────────────┘  │
                                                   │ 挂载
                                 ┌─────────────┐  │
                                 │  Volume      │←─┘
                                 │  (主机磁盘)  │
                                 │  持久存在    │←─┐
                                 └─────────────┘  │ 挂载
                                 ┌─────────────┐  │
                                 │  容器 B      │  │
                                 │  /data ──────┼──┘
                                 └─────────────┘
```

**类比：** Volume 就像把数据存到 localStorage 而不是组件 state——组件卸载了数据还在。

### 1.5 Docker Network（容器间通信）

多个容器要互相通信怎么办？Docker Network 让它们通过**服务名**互相访问：

```
┌─ docker-compose 创建的网络 ─────────────────────────────────┐
│                                                              │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │   api    │      │    db    │      │   redis  │          │
│  │ :8080    │─────→│  :5432   │      │  :6379   │          │
│  │          │─────→│          │      │          │          │
│  └──────────┘      └──────────┘      └──────────┘          │
│                                                              │
│  api 里写的连接地址：                                         │
│  ✅ postgresql://admin:pass@db:5432/myapp                    │
│  ❌ postgresql://admin:pass@localhost:5432/myapp              │
│                                                              │
│  为什么？因为每个容器有自己的 localhost，                      │
│  "db" 是 docker-compose 里的服务名，会被 DNS 解析为容器 IP     │
└──────────────────────────────────────────────────────────────┘
```

**关键理解：** 在 docker-compose 里，服务名就是 hostname。`api` 容器里写 `db:5432`，Docker 网络会把 `db` 解析到对应容器的 IP。这就像前端项目里用环境变量 `VITE_API_URL` 而不是硬编码 IP 一样。

### 1.6 核心概念速查表

| 概念               | 说明                                           |
| ------------------ | ---------------------------------------------- |
| 镜像 Image         | 只读模板，包含运行应用所需的一切               |
| 容器 Container     | 镜像的运行实例，隔离的进程                     |
| Dockerfile         | 构建镜像的指令文件                             |
| Registry           | 镜像仓库（Docker Hub、阿里云 ACR 等）          |
| Volume             | 持久化存储，容器删除后数据不丢失               |
| Network            | 容器间通信的虚拟网络                           |

## 2. 第一个 Docker 体验

在安装任何软件之前，先感受一下 Docker 的威力。

### 2.1 五分钟启动 PostgreSQL

传统方式安装 PostgreSQL：下载安装包 → 选版本 → 配置端口 → 创建用户 → 设置密码 → 添加环境变量 → 重启服务... 至少 20 分钟。

Docker 方式：

```bash
docker run -d \
  --name my-postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:16-alpine
```

完事。数据库已经在运行了。连接试试：

```bash
# 进入容器内的 psql 客户端
docker exec -it my-postgres psql -U admin -d myapp

# 或者用你本地的数据库客户端连接 localhost:5432
```

### 2.2 五分钟启动 Redis

```bash
docker run -d \
  --name my-redis \
  -p 6379:6379 \
  redis:7-alpine
```

验证：

```bash
docker exec -it my-redis redis-cli ping
# 输出: PONG
```

### 2.3 对比：有 Docker vs 没有 Docker

| 步骤             | 传统安装                             | Docker                         |
| ---------------- | ------------------------------------ | ------------------------------ |
| 下载             | 找官网、选版本、选 OS                | 自动拉镜像                     |
| 安装             | 运行安装程序、可能编译               | 无                             |
| 配置             | 改配置文件、设环境变量               | -e 参数一行搞定                |
| 端口             | 可能和现有服务冲突                   | -p 映射到任意端口              |
| 多版本共存       | 痛苦（装两个 PG？）                  | 轻松（跑两个容器即可）         |
| 卸载             | 残留配置文件、注册表项               | docker rm 干干净净             |
| 团队协作         | "按照 wiki 装一遍"                   | docker-compose up              |

### 2.4 常用命令

```bash
# 镜像操作
docker build -t myapp:latest .
docker images
docker rmi myapp:latest

# 容器操作
docker run -d -p 3000:3000 --name myapp myapp:latest
docker ps                   # 查看运行中的容器
docker ps -a                # 查看所有容器
docker logs myapp           # 查看日志
docker exec -it myapp sh    # 进入容器
docker stop myapp
docker rm myapp

# 清理
docker system prune -a      # 清理未使用的镜像/容器/网络
```

## 3. Dockerfile 编写与逐行解读

### 3.1 基础指令速查

| 指令       | 作用                       | 前端类比                         |
| ---------- | -------------------------- | -------------------------------- |
| FROM       | 指定基础镜像               | 继承一个 base class              |
| WORKDIR    | 设定工作目录               | cd 到项目目录                    |
| COPY       | 复制文件到镜像内           | 把文件放进项目                   |
| RUN        | 构建时执行命令             | npm scripts 里的构建脚本         |
| EXPOSE     | 声明容器要监听的端口       | 告诉别人"我在这个端口提供服务"   |
| CMD        | 容器启动时的默认命令       | npm start                        |
| ENV        | 设置环境变量               | .env 文件                        |
| ARG        | 构建时的变量（不进入运行时）| 构建参数                         |

### 3.2 多阶段构建 Dockerfile（Node.js 应用）

```dockerfile
# ──────────────────────────────────────────────
# 阶段 1: base — 准备 pnpm 环境
# ──────────────────────────────────────────────
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ──────────────────────────────────────────────
# 阶段 2: deps — 只安装依赖
# ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ──────────────────────────────────────────────
# 阶段 3: build — 编译 TypeScript
# ──────────────────────────────────────────────
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ──────────────────────────────────────────────
# 阶段 4: runner — 最终运行镜像（最小化）
# ──────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### 3.3 逐行解读

**为什么用多阶段构建？**

```
单阶段构建的问题：

最终镜像 = node:20-alpine + 源码 + devDependencies + 构建产物
大小：   ~800MB 😱

多阶段构建：

最终镜像 = node:20-alpine + 构建产物 + 生产 dependencies
大小：   ~150MB ✅

原理：每个 FROM 开启一个新阶段，最终镜像只包含最后一个阶段的内容。
前面阶段的 devDependencies、源码、构建工具都不会进入最终镜像。
```

**类比：** 就像前端打包——你的 `dist` 文件夹不会包含 `webpack`、`eslint`、`typescript` 这些 devDependencies 的代码。多阶段构建做的是同样的事。

**构建缓存的秘密：** 为什么先 COPY package.json 再 COPY 源码？

```
场景：你只改了 src/index.ts 里一行代码

如果是这样写：
  COPY . .              ← 源码变了，这层重新执行
  RUN pnpm install      ← 依赖没变但也得重新装 😫（3分钟）
  RUN pnpm build        ← 重新构建

正确写法：
  COPY package.json .   ← 没变，走缓存 ✅
  RUN pnpm install      ← 没变，走缓存 ✅（节省3分钟）
  COPY . .              ← 源码变了，从这里开始重新执行
  RUN pnpm build        ← 重新构建
```

### 3.4 .dockerignore

和 `.gitignore` 一个道理——告诉 Docker 构建时不要把这些文件复制到构建上下文中：

```
node_modules
dist
.git
.env
*.md
.vscode
```

为什么要忽略 `node_modules`？因为容器里会重新 `pnpm install`，本地的 node_modules 可能是 Windows 平台编译的二进制文件，在 Linux 容器里根本跑不起来。

## 4. docker-compose 编排多服务

真实的全栈应用不只有一个服务。你的 API 需要数据库、缓存、可能还有消息队列。docker-compose 让你用一个 YAML 文件声明所有服务，一条命令全部启动。

**类比：** docker-compose 之于 Docker，就像 monorepo 的 `pnpm -r` 之于单个项目的 `pnpm`——批量管理多个服务。

### 4.1 典型全栈应用编排

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: myapp
    ports:
      - '5432:5432'
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U admin']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - '8080:8080'
    environment:
      DATABASE_URL: postgresql://admin:admin123@db:5432/myapp
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-secret-key
    depends_on:
      db:
        condition: service_healthy

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    depends_on:
      - api

volumes:
  pg-data:
```

### 4.2 关键配置深入解释

**depends_on + healthcheck：启动顺序保障**

```yaml
# 问题：api 启动时 db 还没准备好接受连接 → 连接失败 → 应用崩溃
# 解决：healthcheck 确认 db 真正就绪后，才启动 api

db:
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U admin']  # 每隔一段时间执行这个检查
    interval: 5s     # 每 5 秒检查一次
    timeout: 5s      # 超过 5 秒算失败
    retries: 5       # 连续失败 5 次标记为 unhealthy

api:
  depends_on:
    db:
      condition: service_healthy  # 只有 db 是 healthy 状态才启动 api
```

**类比：** 就像前端渲染——你不会在数据没加载完时就渲染列表组件。`depends_on + healthcheck` 就是后端的 "loading state"。

**服务间通信：为什么写 `db:5432` 而不是 `localhost:5432`？**

```yaml
api:
  environment:
    DATABASE_URL: postgresql://admin:admin123@db:5432/myapp
    #                                        ^^
    # 这里的 "db" 是 docker-compose.yml 里的服务名
    # Docker 会创建一个内部 DNS，把 "db" 解析到 db 容器的 IP
```

每个容器有自己独立的网络命名空间。容器 A 里的 `localhost` 指的是容器 A 自己，不是容器 B。要访问另一个容器，必须用服务名。

**volumes 持久化演示：**

```bash
# 1. 启动服务，写入数据
docker-compose up -d
docker exec -it <db容器> psql -U admin -d myapp -c "CREATE TABLE test(id int); INSERT INTO test VALUES(42);"

# 2. 删除容器（注意：不加 -v）
docker-compose down

# 3. 重新启动
docker-compose up -d

# 4. 数据还在！
docker exec -it <db容器> psql -U admin -d myapp -c "SELECT * FROM test;"
#  id
# ----
#  42

# 如果用 docker-compose down -v 则会删除 volumes，数据就真没了
```

底部的 `volumes: pg-data:` 声明了一个命名卷，数据存储在主机的 Docker 管理区域，与容器生命周期无关。

### 4.3 常用操作

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api

# 重建单个服务
docker-compose up -d --build api

# 停止并清理
docker-compose down
docker-compose down -v  # 同时删除 volumes
```

## 5. 开发环境 vs 生产环境的 Docker 配置

### 5.1 核心差异

| 维度           | 开发环境                                | 生产环境                           |
| -------------- | --------------------------------------- | ---------------------------------- |
| 源码挂载       | bind mount，修改即生效                  | COPY 打包进镜像                    |
| 热更新         | 需要（nodemon / tsx watch）             | 不需要                             |
| 构建方式       | 不构建，直接跑 ts                       | 多阶段构建，最小镜像               |
| 调试工具       | 包含（devDependencies）                 | 不包含                             |
| 环境变量       | .env.development                        | 从 CI/CD secrets 注入              |
| 镜像大小       | 不关心                                  | 越小越好                           |

### 5.2 开发环境 docker-compose

```yaml
# docker-compose.dev.yml
services:
  api:
    build:
      context: ./api
      dockerfile: Dockerfile.dev
    ports:
      - '8080:8080'
    volumes:
      - ./api/src:/app/src        # bind mount: 主机文件直接映射到容器内
    environment:
      DATABASE_URL: postgresql://admin:admin123@db:5432/myapp
    command: pnpm dev             # 覆盖 CMD，使用 dev 模式（带 watch）
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: myapp
    ports:
      - '5432:5432'
    volumes:
      - pg-data:/var/lib/postgresql/data

volumes:
  pg-data:
```

```dockerfile
# Dockerfile.dev — 开发用，不需要多阶段构建
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
CMD ["pnpm", "dev"]
```

**bind mount 的效果：** 你在 VS Code 里改 `api/src/index.ts`，容器里的 `/app/src/index.ts` 会实时同步变化，配合 nodemon 就实现了热更新。

**类比：** bind mount 就像 Vite 的 HMR——改了代码不用重新构建整个项目，直接生效。

### 5.3 生产环境

生产环境用前面 §3.2 的多阶段构建 Dockerfile，配合标准的 `docker-compose.yml`。不挂载源码，不暴露调试端口，使用编译后的产物。

## 6. 环境变量管理与多环境配置

### 6.1 .env 文件管理

```bash
# .env.development
NODE_ENV=development
DATABASE_URL=postgresql://admin:admin123@localhost:5432/myapp
JWT_SECRET=dev-secret
CORS_ORIGIN=http://localhost:3000

# .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-host:5432/myapp_prod
JWT_SECRET=${JWT_SECRET}  # 从环境注入，不硬编码
CORS_ORIGIN=https://myapp.com
```

### 6.2 配置管理模式

```ts
// src/config.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url()
})

export const config = envSchema.parse(process.env)
```

## 7. 常见问题排查（前端同学高频踩坑）

### 7.1 端口冲突：`port is already allocated`

```bash
# 原因：主机的端口已被占用（可能是之前的容器没停，或者本地装了 PostgreSQL）
# 解决：
docker ps                          # 查看谁在占端口
docker stop <container_id>         # 停掉冲突容器

# 或者换一个主机端口
docker run -p 5433:5432 postgres   # 主机用 5433，容器内仍是 5432
```

### 7.2 镜像拉取慢：配置国内镜像源

```json
// Docker Desktop → Settings → Docker Engine，添加：
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
```

配置后重启 Docker Desktop 即可。

### 7.3 容器无法启动：docker logs 查看原因

```bash
# 容器启动就退出？看日志找原因
docker logs <container_name>

# 常见原因：
# - 端口被占用
# - 环境变量缺失（比如 DATABASE_URL 没配）
# - 依赖服务没启动（db 还没 ready 就连接）
# - 权限问题（文件属于 root，应用以非 root 运行）
```

### 7.4 文件修改不生效：bind mount vs COPY 的区别

```
COPY（构建时复制）：
  修改源码 → 需要重新 docker build → 重新启动容器
  适用：生产环境

bind mount（运行时挂载）：
  修改源码 → 容器内实时看到新文件 → 配合 watch 自动重启
  适用：开发环境

# 开发时用 bind mount：
docker run -v $(pwd)/src:/app/src myapp

# docker-compose 里：
volumes:
  - ./src:/app/src    # 这是 bind mount
```

### 7.5 数据丢失：没用 volume

```bash
# ❌ 错误：没有 volume，数据在容器内部，删容器就没了
docker run -d postgres:16-alpine

# ✅ 正确：用命名 volume 持久化
docker run -d -v pg-data:/var/lib/postgresql/data postgres:16-alpine

# ✅ 正确：docker-compose 里声明 volumes
```

### 7.6 容器间无法通信：不在同一网络

```bash
# 问题：手动 docker run 的容器默认不在同一网络，无法用服务名互访

# 解决方案 1：创建自定义网络
docker network create mynet
docker run -d --network mynet --name db postgres:16-alpine
docker run -d --network mynet --name api myapp

# 解决方案 2：直接用 docker-compose（自动创建共享网络，推荐）
docker-compose up -d
```

## 8. Vercel / 云服务器部署

### 8.1 Vercel 部署（前端 + Serverless）

```bash
# 安装 Vercel CLI
pnpm add -g vercel

# 登录并部署
vercel login
vercel          # 部署预览环境
vercel --prod   # 部署生产环境
```

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 8.2 云服务器部署（阿里云 / 腾讯云）

```bash
# SSH 到服务器
ssh root@your-server-ip

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 上传并运行
scp docker-compose.yml root@your-server-ip:/app/
ssh root@your-server-ip "cd /app && docker-compose up -d"
```

## 9. Nginx 反向代理与 HTTPS

### 9.1 Nginx 配置

```nginx
# nginx.conf
server {
    listen 80;
    server_name myapp.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name myapp.com;

    ssl_certificate /etc/ssl/certs/myapp.pem;
    ssl_certificate_key /etc/ssl/private/myapp-key.pem;

    # 前端静态资源
    location / {
        root /var/www/myapp;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 9.2 Docker 化 Nginx

```yaml
# docker-compose.yml 追加
nginx:
  image: nginx:alpine
  ports:
    - '80:80'
    - '443:443'
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    - ./certbot/conf:/etc/ssl
    - ./web/dist:/var/www/myapp
  depends_on:
    - api
```

## 10. CI/CD 基础（GitHub Actions）

### 10.1 基础工作流

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /app
            git pull origin main
            docker-compose up -d --build
```

## 11. 课堂练习

### 练习 5：容器化全栈应用并部署

**目标：** 将前几讲完成的全栈应用（React + Express + PostgreSQL）容器化，并配置 CI/CD。

**要求：**

1. 为前端和后端分别编写 Dockerfile（多阶段构建）
2. 编写 docker-compose.yml 编排所有服务
3. 配置环境变量管理（开发/生产分离）
4. 配置 Nginx 反向代理
5. 编写 GitHub Actions 自动部署工作流
6. 本地 `docker-compose up` 一键启动全部服务

**验证标准：**

- [ ] `docker-compose up -d` 一键启动
- [ ] 前端可通过 `http://localhost` 访问
- [ ] API 可通过 `http://localhost/api` 访问
- [ ] 数据库数据持久化（重启容器不丢失）
- [ ] GitHub Actions 工作流语法正确

**参考代码：** 见 [demos/05-docker-deploy](../demos/05-docker-deploy)
