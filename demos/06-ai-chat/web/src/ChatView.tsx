/**
 * 流式聊天页 — @ai-sdk/react 的 useChat 封装。
 *
 * useChat 职责：
 * - 维护 messages 状态（多轮上下文）
 * - POST /api/chat 并消费 SSE 数据流，逐字更新 assistant content
 * - 暴露 isLoading / error / stop 等状态
 *
 * api 指向 Vite 代理路径，实际请求转发到 localhost:8080
 */
import { useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { AssistantMessage } from './components/AssistantMessage'
import { copyToClipboard } from './utils/messageContent'

const SUGGESTIONS = [
  '北京今天天气怎么样？',
  '上海现在几点了？',
  '帮我写一段 React useEffect 的最佳实践'
]

export function ChatView() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop, append } = useChat({
    api: '/api/chat'
  })
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null)

  async function copyUserMessage(messageId: string, content: string) {
    const ok = await copyToClipboard(content)
    if (!ok) return
    setCopiedUserId(messageId)
    window.setTimeout(() => setCopiedUserId(null), 1800)
  }

  function askSuggestion(text: string) {
    append({ role: 'user', content: text })
  }

  return (
    <div className="chat">
      <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className="empty-state">
            <p className="empty-kicker">开始对话</p>
            <h3 className="empty-title">试试这些问题</h3>
            <p className="empty-desc">支持 Markdown 渲染、工具调用与多轮上下文。</p>
            <div className="suggestion-list">
              {SUGGESTIONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => askSuggestion(text)}
                  disabled={isLoading}
                >
                  {text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <article key={msg.id} className={`message ${msg.role}`}>
            <div className="message-meta">
              <span className="message-role">{msg.role === 'user' ? '你' : 'Assistant'}</span>
            </div>

            {msg.role === 'assistant' ? (
              <>
                {/* 仅官方 OpenAI tool calling 时会有值；第三方 compat 模式不经过 SSE tool 事件 */}
                {msg.toolInvocations?.map((inv, idx) => (
                  <div key={idx} className="tool-call tool-call-standalone">
                    <span className="tool-call-dot" aria-hidden="true" />
                    调用工具 <strong>{inv.toolName}</strong>
                    <span className="tool-call-state">{inv.state}</span>
                  </div>
                ))}
                <AssistantMessage content={msg.content} messageId={msg.id} />
              </>
            ) : (
              <>
                <div className="bubble user">
                  <span>{msg.content}</span>
                </div>
                {msg.content.trim() && (
                  <div className="message-actions is-compact">
                    <button
                      type="button"
                      className="message-action"
                      onClick={() => copyUserMessage(msg.id, msg.content)}
                    >
                      {copiedUserId === msg.id ? '已复制' : '复制'}
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        ))}

        {/* 首 token 未到达前显示 typing；流式开始后 content 会追加到同一条 assistant 消息 */}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <article className="message assistant" aria-label="Assistant 正在输入">
            <div className="message-meta">
              <span className="message-role">Assistant</span>
            </div>
            <div className="bubble assistant typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </article>
        )}

        {error && (
          <div className="error" role="alert">
            出错了：{error.message || '请求失败，请稍后再试。'}
          </div>
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <div className="composer">
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行"
            disabled={isLoading}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
          />
          {isLoading ? (
            <button type="button" className="btn btn-stop" onClick={stop}>
              停止
            </button>
          ) : (
            <button type="submit" className="btn btn-send" disabled={!input.trim()}>
              发送
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
