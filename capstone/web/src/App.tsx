import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from '@/store/auth'
import { Layout } from '@/components/Layout'
import { AuthPage } from '@/pages/AuthPage'
import { BoardPage } from '@/pages/BoardPage'
import { MembersPage } from '@/pages/MembersPage'

export default function App() {
  const token = useAuth((s) => s.token)

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BoardPage />} />
        <Route path="members" element={<MembersPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
