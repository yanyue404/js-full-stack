# 环境准备

在开始培训之前，请确保安装以下软件和工具。

## 必装软件

### 1. Node.js（v20 LTS）

推荐使用 nvm 管理 Node 版本：

```bash
# macOS / Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
nvm use 20

# Windows（使用 nvm-windows）
# 下载：https://github.com/coreybutler/nvm-windows/releases
nvm install 20
nvm use 20
```

验证安装：

```bash
node -v   # >= 20.0.0
npm -v    # >= 10.0.0
```

### 2. pnpm 包管理器

```bash
npm install -g pnpm
pnpm -v   # >= 9.0.0
```

### 3. Git

```bash
# macOS
brew install git

# Windows
# 下载：https://git-scm.com/download/win

# 验证
git --version
```

### 4. Docker Desktop

- [macOS / Windows 下载](https://www.docker.com/products/docker-desktop/)
- 安装后验证：

```bash
docker --version          # >= 24.0
docker-compose --version  # >= 2.20
```

### 5. PostgreSQL

可以使用 Docker 运行（推荐），也可以本地安装：

```bash
# Docker 方式（推荐）
docker run --name pg-dev -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# 验证连接
docker exec -it pg-dev psql -U postgres
```

### 6. 代码编辑器

推荐 **Cursor**（内置 AI 编程能力）或 **VS Code**：

- [Cursor 下载](https://cursor.sh)
- [VS Code 下载](https://code.visualstudio.com)

必装扩展：

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Prisma / Drizzle（数据库 ORM 语法高亮）
- Docker
- Thunder Client（API 调试）或使用 Postman

### 7. AI 工具账号

至少准备一个 AI 工具的可用账号：

- [Claude](https://claude.ai)
- [ChatGPT](https://chat.openai.com)
- [Google Gemini](https://gemini.google.com)

## 可选软件

| 工具          | 用途                          | 下载地址                                    |
| ------------- | ----------------------------- | ------------------------------------------- |
| TablePlus     | 数据库可视化管理              | https://tableplus.com                       |
| Postman       | API 调试                      | https://www.postman.com                     |
| Warp          | 现代终端（macOS）             | https://www.warp.dev                        |
| Xcode         | iOS / Swift 开发（第七讲需要）| App Store                                   |
| Charles Proxy | 网络抓包调试                  | https://www.charlesproxy.com                |

## 验证清单

安装完成后，请逐项确认：

- [ ] `node -v` 输出 v20+
- [ ] `pnpm -v` 输出 v9+
- [ ] `git --version` 正常输出
- [ ] `docker --version` 正常输出
- [ ] PostgreSQL 可连接（Docker 或本地）
- [ ] 编辑器已安装且扩展就绪
- [ ] 至少一个 AI 工具账号可用
