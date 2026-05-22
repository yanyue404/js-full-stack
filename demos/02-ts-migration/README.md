# 练习 2：TypeScript 项目迁移

将一个纯 JavaScript React 项目迁移为 TypeScript，并配置完整的工程化体系。

## 目标

掌握 TypeScript 在 React 项目中的最佳实践，建立类型安全的工程化体系（ESLint + Prettier + husky）。

## 要求

1. 将练习 1 的 Todo App 中所有 `.jsx` 文件重命名为 `.tsx`
2. 为所有组件 Props 添加类型定义
3. 为 Zustand Store 添加完整的类型
4. 配置路径别名 `@/*`
5. 配置 ESLint + Prettier + husky + lint-staged
6. 确保 `pnpm exec tsc --noEmit` 零报错

## 快速开始

```bash
# 在练习 1 的项目基础上操作
cd todo-app

# 安装 ESLint + Prettier + husky
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
pnpm add -D prettier eslint-config-prettier
pnpm add -D husky lint-staged

# 初始化 husky
npx husky init
```

## 需要添加类型的地方

| 位置 | 需要做的事 | 示例 |
| ---- | ---------- | ---- |
| 组件 Props | `defineProps` + interface | `interface TodoItemProps { id: string; text: string; done: boolean }` |
| Zustand Store | Store interface | `interface TodoStore { todos: Todo[]; addTodo: (text: string) => void }` |
| 事件处理 | 事件类型 | `(e: React.ChangeEvent<HTMLInputElement>)` |
| API 响应 | 返回类型 | `async function fetchTodos(): Promise<Todo[]>` |
| 路由参数 | useParams 泛型 | `useParams<{ id: string }>()` |

## 配置文件参考

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "none",
  "printWidth": 100,
  "tabWidth": 2
}
```

```json
// package.json 追加
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

## 验证标准

- [ ] 所有文件均为 `.ts` / `.tsx`
- [ ] 无 `any` 类型（除非有明确注释说明原因）
- [ ] `pnpm exec tsc --noEmit` 通过
- [ ] `pnpm exec eslint .` 无报错
- [ ] Git commit 时自动格式化（husky + lint-staged）
- [ ] 路径别名 `@/` 在 IDE 中有正确的跳转和补全

## 提示

- `tsconfig.json` 的 `paths` 和 `vite.config.ts` 的 `resolve.alias` 需要同时配置
- Zustand 的 `create` 函数接受泛型：`create<TodoStore>((set) => ({...}))`
- `eslint-config-prettier` 用来关闭 ESLint 中和 Prettier 冲突的规则

## 参考实现

本目录提供了一份完整的"迁移完成"版本，相比 demo 01 多出：

- **严格的 TS 配置**：`strict`、`noUnusedLocals`、`noUnusedParameters` 全开
- **ESLint flat config**：`eslint.config.js`（typescript-eslint + react-hooks + react-refresh + prettier 关冲突）
- **Prettier**：`.prettierrc` + `.prettierignore`
- **husky + lint-staged**：`.husky/pre-commit`，提交前自动 `eslint --fix` + `prettier --write`
- **高级 TS 实战**：
  - `src/components/List.tsx` —— 泛型组件 `List<T>`
  - `src/hooks/useAsync.ts` —— 类型完整的自定义 Hook
  - `src/types/todo.ts` —— `Pick` / `Partial` / `Record` 工具类型应用
  - `src/store/todoStore.ts` —— `create<TodoStore>` 显式泛型 + 状态/动作类型拆分

运行：

```bash
cd demos/02-ts-migration
pnpm install
pnpm dev          # 启动
pnpm typecheck    # 类型检查
pnpm lint         # ESLint
pnpm format       # Prettier 格式化
```

> 第一次 clone 后 husky 会通过 `prepare` 脚本自动注册 Git 钩子，无需手动 `husky init`。
