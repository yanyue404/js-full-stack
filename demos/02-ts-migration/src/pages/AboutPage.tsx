import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AboutPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>关于这个 Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>这是第二讲的配套示例，相比第一讲多了：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>严格的 TypeScript 配置（strict / noUnusedLocals 等）</li>
          <li>路径别名 <code>@/*</code> 在 tsconfig 和 vite 同步配置</li>
          <li>ESLint flat config（typescript-eslint + react-hooks）</li>
          <li>Prettier + .prettierignore</li>
          <li>husky pre-commit + lint-staged</li>
          <li>泛型组件 List&lt;T&gt; + 自定义 Hook useAsync&lt;T&gt;</li>
          <li>工具类型：Pick / Partial / Record / Omit 的实战</li>
        </ul>
      </CardContent>
    </Card>
  )
}
