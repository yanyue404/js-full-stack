import { Outlet, NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: '列表', end: true },
  { to: '/showcase', label: 'TS 演示' },
  { to: '/about', label: '关于' }
] as const

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Todo App · TS 强化版</h1>
          <nav className="flex gap-4 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'transition-colors',
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Demo 02 · TypeScript + ESLint + Prettier + husky
      </footer>
    </div>
  )
}
