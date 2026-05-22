import { BrowserRouter, Routes, Route } from 'react-router'
import { Layout } from '@/pages/Layout'
import { TodoListPage } from '@/pages/TodoListPage'
import { TodoDetailPage } from '@/pages/TodoDetailPage'
import { AboutPage } from '@/pages/AboutPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TodoListPage />} />
          <Route path="todos/:id" element={<TodoDetailPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<TodoListPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
