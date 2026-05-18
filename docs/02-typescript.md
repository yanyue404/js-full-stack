# 第二讲：TypeScript 深入与前端工程化

> 从"能用"到"用好"，建立类型安全的工程体系。

## 1. TypeScript 核心类型系统

### 1.1 基础类型

```ts
// 原始类型
const name: string = 'Alice'
const age: number = 25
const active: boolean = true

// 数组
const ids: number[] = [1, 2, 3]
const names: Array<string> = ['a', 'b']

// 元组
const pair: [string, number] = ['age', 25]

// 枚举
enum Status {
  Draft = 'DRAFT',
  Published = 'PUBLISHED',
  Archived = 'ARCHIVED'
}

// 联合类型
type Theme = 'light' | 'dark' | 'system'
```

### 1.2 接口与类型别名

```ts
// interface：描述对象结构，可 extends 继承
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user'
  createdAt: Date
}

interface Admin extends User {
  role: 'admin'
  permissions: string[]
}

// type：更灵活，支持联合、交叉、映射
type Result<T> = { success: true; data: T } | { success: false; error: string }

type UserWithPosts = User & { posts: Post[] }
```

### 1.3 类型收窄（Narrowing）

```ts
function processValue(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase()
  }
  return value.toFixed(2)
}

function handleResult(result: Result<User>) {
  if (result.success) {
    console.log(result.data.name) // TS 知道这里是 success 分支
  } else {
    console.error(result.error)
  }
}
```

## 2. 泛型、工具类型与高级模式

### 2.1 泛型基础

```ts
function first<T>(arr: T[]): T | undefined {
  return arr[0]
}

function mapObject<K extends string, V, R>(
  obj: Record<K, V>,
  fn: (value: V) => R
): Record<K, R> {
  const result = {} as Record<K, R>
  for (const key in obj) {
    result[key] = fn(obj[key])
  }
  return result
}
```

### 2.2 内置工具类型

```ts
// Partial —— 所有属性可选
type UpdateUser = Partial<User>

// Required —— 所有属性必填
type CompleteUser = Required<User>

// Pick —— 选取部分属性
type UserPreview = Pick<User, 'id' | 'name'>

// Omit —— 排除部分属性
type CreateUser = Omit<User, 'id' | 'createdAt'>

// Record —— 键值对映射
type RoleCount = Record<'admin' | 'user', number>

// ReturnType —— 提取函数返回类型
type ApiResponse = ReturnType<typeof fetchUsers>

// Awaited —— 解包 Promise
type Users = Awaited<ReturnType<typeof fetchUsers>>
```

### 2.3 条件类型与 infer

```ts
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

type ArrayElement<T> = T extends (infer U)[] ? U : never

// 实际应用：提取 API 响应的 data 类型
type ApiData<T> = T extends { data: infer D } ? D : never
```

### 2.4 模板字面量类型

```ts
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type ApiRoute = `/api/${string}`
type EventName = `on${Capitalize<string>}`
```

## 3. React + TypeScript 最佳实践

### 3.1 组件 Props 类型

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: React.ReactNode
}

function Button({ variant = 'primary', size = 'md', children, ...props }: ButtonProps) {
  return <button {...props}>{children}</button>
}
```

### 3.2 泛型组件

```tsx
interface ListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T) => string
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  )
}

// 使用时自动推断类型
<List
  items={users}
  renderItem={(user) => <span>{user.name}</span>}
  keyExtractor={(user) => user.id}
/>
```

### 3.3 Hook 类型

```tsx
function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{
    loading: boolean
    data: T | null
    error: Error | null
  }>({ loading: true, data: null, error: null })

  useEffect(() => {
    setState({ loading: true, data: null, error: null })
    asyncFn()
      .then((data) => setState({ loading: false, data, error: null }))
      .catch((error) => setState({ loading: false, data: null, error }))
  }, deps)

  return state
}
```

### 3.4 事件处理类型

```tsx
function SearchInput() {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // submit
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} onKeyDown={handleKeyDown} />
    </form>
  )
}
```

## 4. Vite 构建体系与配置

### 4.1 Vite 核心优势

- 开发环境：原生 ESM + 按需编译，启动秒级
- 生产构建：Rollup 打包，Tree-shaking、代码分割
- 插件生态：兼容 Rollup 插件

### 4.2 常用配置

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  }
})
```

### 4.3 环境变量

```bash
# .env.development
VITE_API_URL=http://localhost:8080
VITE_APP_TITLE=My App (Dev)

# .env.production
VITE_API_URL=https://api.example.com
VITE_APP_TITLE=My App
```

```ts
const apiUrl = import.meta.env.VITE_API_URL
```

## 5. ESLint + Prettier 代码规范

### 5.1 ESLint 配置

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
```

```js
// eslint.config.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
)
```

### 5.2 Prettier 配置

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "tabWidth": 2,
  "bracketSpacing": true
}
```

### 5.3 Git Hooks（husky + lint-staged）

```bash
pnpm add -D husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

## 6. 课堂练习

### 练习 2：TypeScript 项目迁移

**目标：** 将一个纯 JavaScript React 项目迁移为 TypeScript，并配置完整的工程化体系。

**要求：**

1. 将练习 1 的 Todo App 中所有 `.jsx` 文件重命名为 `.tsx`
2. 为所有组件 Props 添加类型定义
3. 为 Zustand Store 添加完整的类型
4. 配置路径别名 `@/*`
5. 配置 ESLint + Prettier + husky + lint-staged
6. 确保 `pnpm exec tsc --noEmit` 零报错

**验证标准：**

- [ ] 所有文件均为 `.ts` / `.tsx`
- [ ] 无 `any` 类型（除非有明确注释说明原因）
- [ ] `tsc --noEmit` 通过
- [ ] `eslint .` 无报错
- [ ] Git commit 时自动格式化

**参考代码：** 见 [demos/02-ts-migration](../demos/02-ts-migration)
