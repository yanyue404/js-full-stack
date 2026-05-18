# 第一讲：前端基础与 React 技术栈

> 掌握现代 React 开发模式，构建高质量前端页面。

## 1. React 18 核心概念与 Hooks

### 1.1 为什么选 React

- 组件化思维：UI = f(state)
- 生态成熟：庞大的社区与丰富的第三方库
- 全栈延伸：Next.js、React Native、React Server Components
- 就业市场：前端岗位需求量最大的框架之一

### 1.2 创建项目

使用 Vite 创建 React + TypeScript 项目：

```bash
pnpm create vite my-app --template react-ts
cd my-app
pnpm install
pnpm dev
```

### 1.3 核心 Hooks

#### useState —— 状态管理

```tsx
const [count, setCount] = useState(0)
const [user, setUser] = useState<User | null>(null)
```

#### useEffect —— 副作用处理

```tsx
useEffect(() => {
  const controller = new AbortController()
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(setData)
  return () => controller.abort()
}, [])
```

#### useRef —— 引用 DOM 或持久值

```tsx
const inputRef = useRef<HTMLInputElement>(null)
inputRef.current?.focus()
```

#### useMemo & useCallback —— 性能优化

```tsx
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
)

const handleClick = useCallback((id: string) => {
  setSelected(id)
}, [])
```

### 1.4 自定义 Hook

将可复用逻辑抽离为自定义 Hook：

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
```

## 2. shadcn/ui 组件库

### 2.1 什么是 shadcn/ui

shadcn/ui 不是传统的 npm 包，而是一套**可复制到项目中的组件集合**。组件基于 Radix UI 原语 + Tailwind CSS 构建，你拥有完全的控制权。

### 2.2 初始化

```bash
pnpm dlx shadcn@latest init
```

按提示选择配置项（TypeScript、Tailwind CSS 版本、CSS 变量等）。

### 2.3 添加组件

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add dialog
pnpm dlx shadcn@latest add form
pnpm dlx shadcn@latest add input
pnpm dlx shadcn@latest add table
```

### 2.4 使用示例

```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>总用户数</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">12,345</p>
        <Button variant="outline" size="sm" className="mt-4">
          查看详情
        </Button>
      </CardContent>
    </Card>
  )
}
```

## 3. Tailwind CSS 实用优先的样式方案

### 3.1 核心理念

Tailwind CSS 采用原子化 CSS（Utility-First）方法：直接在 HTML/JSX 中组合预定义的类名来构建样式，避免编写自定义 CSS 文件。

### 3.2 常用类名速查

| 类别   | 示例                                     |
| ------ | ---------------------------------------- |
| 布局   | `flex` `grid` `items-center` `justify-between` |
| 间距   | `p-4` `mx-auto` `mt-8` `gap-4`          |
| 尺寸   | `w-full` `h-screen` `max-w-md`          |
| 文字   | `text-lg` `font-bold` `text-gray-600`   |
| 颜色   | `bg-white` `text-primary` `border-gray-200` |
| 圆角   | `rounded-md` `rounded-full`             |
| 阴影   | `shadow-sm` `shadow-lg`                 |
| 响应式 | `sm:flex` `md:grid-cols-2` `lg:text-xl` |

### 3.3 响应式设计

Tailwind 默认移动优先，通过断点前缀处理响应式：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>{item.name}</Card>
  ))}
</div>
```

### 3.4 暗色模式

```tsx
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  自动适应明暗模式
</div>
```

## 4. Zustand 状态管理

### 4.1 为什么选 Zustand

- 极简 API，无 Provider 包裹
- 天然支持 TypeScript
- 体积小（< 1KB）
- 可在组件外使用

### 4.2 创建 Store

```ts
import { create } from 'zustand'

interface TodoStore {
  todos: Todo[]
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  removeTodo: (id: string) => void
}

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  addTodo: (text) =>
    set((state) => ({
      todos: [...state.todos, { id: crypto.randomUUID(), text, done: false }]
    })),
  toggleTodo: (id) =>
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      )
    })),
  removeTodo: (id) =>
    set((state) => ({
      todos: state.todos.filter((t) => t.id !== id)
    }))
}))
```

### 4.3 在组件中使用

```tsx
function TodoList() {
  const { todos, toggleTodo, removeTodo } = useTodoStore()

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={todo.done}
            onChange={() => toggleTodo(todo.id)}
          />
          <span className={todo.done ? 'line-through' : ''}>{todo.text}</span>
          <button onClick={() => removeTodo(todo.id)}>删除</button>
        </li>
      ))}
    </ul>
  )
}
```

### 4.4 持久化中间件

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      todos: [],
      // ... actions
    }),
    { name: 'todo-storage' }
  )
)
```

## 5. React Router 路由管理

### 5.1 安装与配置

```bash
pnpm add react-router
```

```tsx
import { BrowserRouter, Routes, Route } from 'react-router'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="todos" element={<TodoPage />} />
          <Route path="todos/:id" element={<TodoDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### 5.2 路由参数与导航

```tsx
import { useParams, useNavigate } from 'react-router'

function TodoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div>
      <h1>Todo #{id}</h1>
      <button onClick={() => navigate('/todos')}>返回列表</button>
    </div>
  )
}
```

### 5.3 路由守卫

```tsx
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

## 6. 课堂练习

### 练习 1：搭建待办事项应用

**目标：** 用 React + shadcn/ui + Tailwind CSS + Zustand 搭建一个完整的 Todo App。

**要求：**

1. 使用 Vite 创建项目，集成 shadcn/ui + Tailwind CSS
2. 实现待办事项的增删改查功能
3. 使用 Zustand 管理状态，并持久化到 localStorage
4. 支持筛选：全部 / 已完成 / 未完成
5. 响应式布局：移动端与桌面端适配
6. 使用 React Router 实现至少两个页面（列表页 + 详情页）

**验证标准：**

- [ ] 能正常添加、删除、切换待办状态
- [ ] 刷新页面后数据不丢失
- [ ] 筛选功能正常工作
- [ ] 移动端（375px）和桌面端（1440px）布局合理
- [ ] 代码无 TypeScript 报错

**参考代码：** 见 [demos/01-todo-app](../demos/01-todo-app)
