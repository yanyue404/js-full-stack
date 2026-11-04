import { NavLink, Outlet } from 'react-router'
import { LayoutGrid, LogOut, Users } from 'lucide-react'
import { useAuth } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm', isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <span className="font-semibold">TeamBoard</span>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navClass}>
              <LayoutGrid className="h-4 w-4" /> 看板
            </NavLink>
            <NavLink to="/members" className={navClass}>
              <Users className="h-4 w-4" /> 成员
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {user?.name} · {user?.role === 'owner' ? '负责人' : '成员'}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" /> 退出
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
