/**
 * 应用壳：左侧导航切换两个独立演示页。
 * - chat   → 流式 SSE + useChat（api/routes/chat.ts）
 * - recipe → 一次性 JSON（api/routes/recipe.ts）
 */
import { useState } from 'react'
import { ChatView } from './ChatView'
import { RecipeView } from './RecipeView'

type Tab = 'chat' | 'recipe'

const NAV: { id: Tab; label: string; desc: string }[] = [
  { id: 'chat', label: '流式聊天', desc: 'SSE · 工具调用' },
  { id: 'recipe', label: '结构化食谱', desc: 'generateObject' }
]

function NavIcon({ tab }: { tab: Tab }) {
  if (tab === 'chat') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4.5 3.6V15H6.5A2.5 2.5 0 0 1 4 12.5v-7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 4.5h12A1.5 1.5 0 0 1 19.5 6v12A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V6A1.5 1.5 0 0 1 6 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 9h8M8 12.5h5.5M8 16h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('chat')
  const current = NAV.find((item) => item.id === tab)!

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          <span className="sidebar-mark">06</span>
          <div>
            <p className="sidebar-eyebrow">JS Full Stack</p>
            <h1 className="sidebar-title">AI 知识问答</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
            >
              <span className="nav-item-icon">
                <NavIcon tab={item.id} />
              </span>
              <span className="nav-item-copy">
                <span className="nav-item-label">{item.label}</span>
                <span className="nav-item-desc">{item.desc}</span>
              </span>
            </button>
          ))}
        </nav>

        <p className="sidebar-footnote">Vercel AI SDK · Express · React</p>
      </aside>

      <div className="app-frame">
        <header className="view-header">
          <div className="view-header-copy">
            <p className="view-eyebrow">Demo 06</p>
            <h2 className="view-title">{current.label}</h2>
            <p className="view-desc">{current.desc}</p>
          </div>
          {tab === 'chat' && <span className="status-badge">Live stream</span>}
        </header>

        <main className="main">{tab === 'chat' ? <ChatView /> : <RecipeView />}</main>
      </div>

      <nav className="mobile-nav" aria-label="移动端导航">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`mobile-nav-item ${tab === item.id ? 'active' : ''}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            <NavIcon tab={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
