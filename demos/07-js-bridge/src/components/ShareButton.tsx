import { useState } from 'react'
import { bridge } from '../bridge'
import type { ShareParams } from '../bridge/types'

const params: ShareParams = {
  title: '全栈前端工程师培训',
  description: '八讲带你打通全链路',
  url: 'https://example.com',
  image: 'https://example.com/cover.jpg'
}

export function ShareButton() {
  const [result, setResult] = useState('')

  async function share() {
    try {
      const res = await bridge.call<{ channel: string }>('share', { ...params })
      setResult(`✅ 已通过 ${res.channel} 分享`)
    } catch {
      // 降级：浏览器原生分享 → 复制链接
      if (navigator.share) {
        await navigator.share(params).catch(() => {})
        setResult('已调用 navigator.share（Web 降级）')
      } else {
        await navigator.clipboard?.writeText(params.url)
        setResult('已复制链接（Web 降级）')
      }
    }
  }

  return (
    <section>
      <h2>调用分享</h2>
      <button onClick={share}>bridge.call('share', …)</button>
      {result && <p>{result}</p>}
    </section>
  )
}
