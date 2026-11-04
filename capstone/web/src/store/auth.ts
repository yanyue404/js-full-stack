import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Member } from '@/lib/api'

interface AuthState {
  token: string | null
  user: Member | null
  login: (token: string, user: Member) => void
  logout: () => void
}

// ponytail: token 存 localStorage，简单但怕 XSS；对安全要求高时改为 httpOnly Cookie
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null })
    }),
    { name: 'teamboard-auth' }
  )
)
