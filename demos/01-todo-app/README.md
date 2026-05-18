# 练习 1：Todo App

使用 React + shadcn/ui + Tailwind CSS + Zustand 搭建一个完整的待办事项应用。

## 目标

掌握现代 React 技术栈的实际使用，包括组件库集成、状态管理、路由配置与响应式布局。

## 要求

1. 使用 Vite 创建 React + TypeScript 项目
2. 集成 shadcn/ui + Tailwind CSS
3. 实现待办事项的增删改查功能
4. 使用 Zustand 管理状态，并持久化到 localStorage
5. 支持筛选：全部 / 已完成 / 未完成
6. 使用 React Router 实现列表页 + 详情页
7. 响应式布局：移动端与桌面端适配

## 快速开始

```bash
# 创建项目
pnpm create vite todo-app --template react-ts
cd todo-app
pnpm install

# 集成 Tailwind CSS + shadcn/ui
pnpm add -D tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init

# 添加组件
pnpm dlx shadcn@latest add button input card checkbox

# 安装路由和状态管理
pnpm add react-router zustand

# 启动
pnpm dev
```

## 验证标准

- [ ] 能正常添加、删除、切换待办状态
- [ ] 刷新页面后数据不丢失（localStorage 持久化）
- [ ] 筛选功能正常工作（全部/已完成/未完成）
- [ ] 移动端（375px）和桌面端（1440px）布局合理
- [ ] 使用了至少 3 个 shadcn/ui 组件
- [ ] 代码无 TypeScript 报错

## 提示

- Zustand 持久化使用 `zustand/middleware` 的 `persist`
- shadcn/ui 的 Checkbox 组件适合做 Todo 状态切换
- Tailwind 的 `grid` + `md:` 断点处理响应式
