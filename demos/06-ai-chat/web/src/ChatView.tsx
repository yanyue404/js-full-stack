import { useChat } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function ChatView() {
  const { messages, input, handleInputChange, handleSubmit, status, error, stop } = useChat({
    api: '/api/chat'
  })

  const loading = status === 'submitted' || status === 'streaming'

  return (
    <div className="chat">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty">
            试试问：<br />
            · 北京今天天气怎么样？<br />
            · 上海现在几点了？<br />
            · 帮我写一段 React useEffect 的最佳实践
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`bubble ${msg.role}`}>
            {msg.parts ? (
              msg.parts.map((part, idx) => {
                if (part.type === 'text') {
                  return msg.role === 'assistant' ? (
                    <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>
                      {part.text}
                    </ReactMarkdown>
                  ) : (
                    <span key={idx}>{part.text}</span>
                  )
                }
                if (part.type === 'tool-invocation') {
                  const { toolName, state } = part.toolInvocation
                  return (
                    <div key={idx} className="tool-call">
                      调用工具 <strong>{toolName}</strong> · {state}
                    </div>
                  )
                }
                return null
              })
            ) : (
              <span>{msg.content}</span>
            )}
          </div>
        ))}

        {error && (
          <div className="error">出错了：{error.message || '请求失败，请稍后再试。'}</div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="输入消息..."
          disabled={loading}
        />
        {loading ? (
          <button type="button" onClick={stop}>
            停止
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            发送
          </button>
        )}
      </form>
    </div>
  )
}
