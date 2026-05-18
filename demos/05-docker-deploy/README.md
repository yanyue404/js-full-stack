# 练习 5：容器化全栈应用并部署

将前几讲完成的全栈应用（React + Express + PostgreSQL）容器化，并配置 CI/CD。

## 目标

掌握 Docker 容器化全栈应用的完整流程：Dockerfile 编写、docker-compose 编排、环境变量管理、Nginx 反向代理、GitHub Actions 自动部署。

## 要求

1. 为前端和后端分别编写 Dockerfile（多阶段构建）
2. 编写 docker-compose.yml 编排所有服务
3. 配置环境变量管理（开发/生产分离）
4. 配置 Nginx 反向代理
5. 编写 GitHub Actions 自动部署工作流
6. 本地 `docker-compose up` 一键启动全部服务

## 项目结构

```
fullstack-app/
├── web/                        # React 前端
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   └── vite.config.ts
├── api/                        # Express 后端
│   ├── src/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── package.json
├── nginx/
│   └── nginx.conf              # Nginx 配置
├── docker-compose.yml          # 生产编排
├── docker-compose.dev.yml      # 开发编排（override）
├── .env.development
├── .env.production
└── .github/
    └── workflows/
        └── deploy.yml          # CI/CD 工作流
```

## 快速开始

```bash
mkdir fullstack-app && cd fullstack-app

# 创建前端
pnpm create vite web --template react-ts
cd web && pnpm install && cd ..

# 创建后端
mkdir api && cd api
pnpm init
pnpm add express cors postgres drizzle-orm
pnpm add -D typescript tsx @types/express @types/cors drizzle-kit
cd ..

# 创建 Nginx 配置目录
mkdir nginx
```

## Dockerfile 模板

### 前端 Dockerfile（web/Dockerfile）

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 后端 Dockerfile（api/Dockerfile）

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 8080
CMD ["node", "dist/index.js"]
```

## docker-compose.yml 模板

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD:-admin123}
      POSTGRES_DB: myapp
    volumes:
      - pg-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U admin']
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD:-admin123}@db:5432/myapp
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-me}
      PORT: 8080
    depends_on:
      db:
        condition: service_healthy

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - api
      - web

  web:
    build: ./web

volumes:
  pg-data:
```

## 操作步骤

### 第一步：本地验证

```bash
# 一键启动所有服务
docker-compose up -d --build

# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api

# 测试接口
curl http://localhost/api/health

# 访问前端
# 浏览器打开 http://localhost

# 停止
docker-compose down
```

### 第二步：编写 .env 文件

```bash
# .env.development
DB_PASSWORD=admin123
JWT_SECRET=dev-secret-key

# .env.production（不提交到 Git！）
DB_PASSWORD=strong-random-password-here
JWT_SECRET=production-secret-key-at-least-32-chars
```

### 第三步：配置 GitHub Actions

在 GitHub 仓库的 Settings → Secrets 中添加：
- `SERVER_HOST` — 服务器 IP
- `SERVER_USER` — SSH 用户名
- `SSH_PRIVATE_KEY` — SSH 私钥

## 验证标准

- [ ] `docker-compose up -d` 一键启动所有服务
- [ ] 前端可通过 `http://localhost` 访问
- [ ] API 可通过 `http://localhost/api` 访问
- [ ] 数据库数据持久化（`docker-compose down` 后再 `up`，数据不丢失）
- [ ] `docker-compose down -v` 后数据才会丢失（验证 volume 作用）
- [ ] `.env.production` 不在 Git 仓库中（已添加到 .gitignore）
- [ ] GitHub Actions 工作流语法正确（可在 Actions 页面看到）
- [ ] Nginx 正确代理前端和 API

## 提示

- 前端构建产物直接用 Nginx 托管，不需要 Node 运行时
- 后端用多阶段构建，最终镜像不包含 devDependencies
- `docker-compose logs -f api` 可以实时看后端日志
- 如果端口冲突，检查本地是否有其他服务占用 80 端口
- `.dockerignore` 文件很重要，避免 `node_modules` 被 COPY 进镜像
