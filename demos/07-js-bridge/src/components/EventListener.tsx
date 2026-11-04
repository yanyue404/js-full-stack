import { useEffect, useState } from 'react'
import { bridge } from '../bridge'
import { emitNativeEvent } from '../bridge/mockNative'
import type { BridgeEvents } from '../bridge/types'

export function EventListener() {
  const [network, setNetwork] = useState<BridgeEvents['networkChange'] | null>(null)
  const [login, setLogin] = useState<BridgeEvents['loginStateChange'] | null>(null)

  useEffect(() => {
    bridge.on('networkChange', setNetwork)
    bridge.on('loginStateChange', setLogin)
    return () => {
      bridge.off('networkChange', setNetwork)
      bridge.off('loginStateChange', setLogin)
    }
  }, [])

  return (
    <section>
      <h2>监听 Native 事件</h2>
      <p>
        网络：<b>{network?.type ?? '—'}</b> · 登录：
        <b>{login ? (login.isLoggedIn ? `已登录 (${login.userId})` : '未登录') : '—'}</b>
      </p>
      {bridge.isNative && (
        <div className="native-side">
          <small>以下按钮代表 Native 侧主动推送：</small>
          <button onClick={() => emitNativeEvent('networkChange', { type: 'wifi' })}>WiFi</button>
          <button onClick={() => emitNativeEvent('networkChange', { type: '4g' })}>4G</button>
          <button onClick={() => emitNativeEvent('networkChange', { type: 'offline' })}>断网</button>
          <button onClick={() => emitNativeEvent('loginStateChange', { isLoggedIn: true, userId: '123' })}>登录</button>
          <button onClick={() => emitNativeEvent('loginStateChange', { isLoggedIn: false })}>登出</button>
        </div>
      )}
    </section>
  )
}
