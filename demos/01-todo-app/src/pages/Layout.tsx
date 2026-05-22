import { Outlet, NavLink } from 'react-router'
import { cn } from '@/lib/utils'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Todo App</h1>
          <nav className="flex gap-4 text-sm">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'transition-colors',
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              列表
            </NavLink>
            <NavLink
              to="/about"
              className={({ isActive }) =>
                cn(
                  'transition-colors',
                  isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              关于
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 md:py-10">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        Demo 01 · React + Tailwind + Zustand + React Router
      </footer>
    </div>
  )
}
