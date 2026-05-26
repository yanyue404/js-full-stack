/** Assistant 气泡：Markdown 渲染 + 复制/下载；与 ChatView 的消息列表解耦便于复用 */
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { copyToClipboard, downloadTextFile, markdownToPlainText } from '../utils/messageContent'

type CopyKind = 'md' | 'text' | 'download'

interface AssistantMessageProps {
  content: string
  messageId: string
}

export function AssistantMessage({ content, messageId }: AssistantMessageProps) {
  const [showSource, setShowSource] = useState(false)
  const [feedback, setFeedback] = useState<CopyKind | null>(null)

  const hasContent = content.trim().length > 0

  function flash(kind: CopyKind) {
    setFeedback(kind)
    window.setTimeout(() => setFeedback(null), 1800)
  }

  async function handleCopyMarkdown() {
    if (!hasContent) return
    const ok = await copyToClipboard(content)
    if (ok) flash('md')
  }

  async function handleCopyPlainText() {
    if (!hasContent) return
    const ok = await copyToClipboard(markdownToPlainText(content))
    if (ok) flash('text')
  }

  function handleDownloadMarkdown() {
    if (!hasContent) return
    downloadTextFile(`assistant-${messageId.slice(0, 8)}.md`, content)
    flash('download')
  }

  return (
    <>
      <div className={`bubble assistant ${showSource ? 'is-source' : ''}`}>
        {showSource ? (
          <pre className="message-source">{content || ' '}</pre>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        )}
      </div>

      {hasContent && (
        <div className="message-actions" aria-label="消息操作">
          <button
            type="button"
            className="message-action"
            onClick={() => setShowSource((value) => !value)}
          >
            {showSource ? '显示渲染' : '显示原文'}
          </button>
          <span className="message-action-divider" aria-hidden="true" />
          <button type="button" className="message-action" onClick={handleCopyMarkdown}>
            {feedback === 'md' ? '已复制 MD' : '复制 MD'}
          </button>
          <span className="message-action-divider" aria-hidden="true" />
          <button type="button" className="message-action" onClick={handleCopyPlainText}>
            {feedback === 'text' ? '已复制文本' : '复制文本'}
          </button>
          <span className="message-action-divider" aria-hidden="true" />
          <button type="button" className="message-action" onClick={handleDownloadMarkdown}>
            {feedback === 'download' ? '已开始下载' : '下载 MD'}
          </button>
        </div>
      )}
    </>
  )
}
