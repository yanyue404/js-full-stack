import { useEffect, useState } from 'react'
import { bridge, BridgeError, mockVersion, nativeLog } from './bridge'
import { DeviceInfo } from './components/DeviceInfo'
import { ShareButton } from './components/ShareButton'
import { EventListener } from './components/EventListener'

const ACTIONS = ['getDeviceInfo', 'share', 'openCamera', 'biometricAuth']

export default function App() {
  const [ready, setReady] = useState(!bridge.isNative)
  const [timeoutResult, setTimeoutResult] = useState('')
  const [, rerender] = useState(0)

  useEffect(() => {
    bridge.init().finally(() => setReady(true))
  }, [])

  async function callSlow(timeout: number) {
    setTimeoutResult('等待中…')
    const start = Date.now()
    try {
      await bridge.call('slowAction', {}, { timeout })
    } catch (e) {
      const err = e as BridgeError
      setTimeoutResult(`${err.code}：${err.message}（${Date.now() - start}ms）→ 使用降级方案`)
    }
  }

  return (
    <main>
      <header className={bridge.isNative ? 'env native' : 'env web'}>
        <b>运行环境：{bridge.platform}</b>
        {bridge.isNative ? ` · Bridge v${bridge.bridgeVersion ?? '…'}` : ' · 当前不在 Native 环境，所有能力走 Web 降级'}
        <nav>
          <a href="?">浏览器</a>
          <a href="?native=1&v=1.2.0">模拟 App v1.2.0</a>
          <a href="?native=1&v=1.0.0">模拟旧版 v1.0.0</a>
          <a href="?native=1&v=2.0.0">模拟新版 v2.0.0</a>
        </nav>
      </header>

      {ready && (
        <>
          <DeviceInfo />
          <ShareButton />
          <EventListener />

          <section>
            <h2>超时处理</h2>
            <button onClick={() => callSlow(1)}>slowAction · 1ms 超时</button>
            <button onClick={() => callSlow(3000)}>slowAction · 3s 超时</button>
            {timeoutResult && <p className="warn">{timeoutResult}</p>}
          </section>

          <section>
            <h2>版本兼容检测（当前 {bridge.isNative ? mockVersion : '无 Native'}）</h2>
            <ul>
              {ACTIONS.map((a) => (
                <li key={a}>
                  <code>supports('{a}')</code> → {bridge.supports(a) ? '✅ 可用' : '❌ 不可用'}
                </li>
              ))}
            </ul>
          </section>

          {bridge.isNative && (
            <section>
              <h2>
                Native 收到的消息 <button onClick={() => rerender((n) => n + 1)}>刷新</button>
              </h2>
              <pre>{nativeLog.map((m) => JSON.stringify(m)).join('\n')}</pre>
            </section>
          )}
        </>
      )}
    </main>
  )
}
