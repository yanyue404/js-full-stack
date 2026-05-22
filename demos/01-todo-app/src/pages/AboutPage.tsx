import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AboutPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>关于这个 Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>这是第一讲的配套示例，演示了：</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Vite + React 18 + TypeScript 项目结构</li>
          <li>Tailwind CSS 原子化样式与响应式断点</li>
          <li>shadcn/ui 风格的 Button / Input / Checkbox / Card 组件</li>
          <li>Zustand + persist 中间件做 localStorage 持久化</li>
          <li>React Router v7 的列表 / 详情两个页面</li>
        </ul>
      </CardContent>
    </Card>
  )
}
