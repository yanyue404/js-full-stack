import { useState } from 'react'
import { ChatView } from './ChatView'
import { RecipeView } from './RecipeView'

type Tab = 'chat' | 'recipe'

export default function App() {
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>AI Demo</h2>
        <button
          className={tab === 'chat' ? 'active' : ''}
          onClick={() => setTab('chat')}
        >
          流式聊天
        </button>
        <button
          className={tab === 'recipe' ? 'active' : ''}
          onClick={() => setTab('recipe')}
        >
          结构化食谱
        </button>
      </aside>
      <main className="main">{tab === 'chat' ? <ChatView /> : <RecipeView />}</main>
    </div>
  )
}
