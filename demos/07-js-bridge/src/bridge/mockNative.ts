/**
 * 在浏览器里模拟 iOS WKWebView：
 * 伪造 window.webkit.messageHandlers.nativeBridge，消息经 postMessage 异步投递给"Native"，
 * 处理完再调用 window.__bridgeCallback —— 与真机上 evaluateJavaScript 回调的时序一致。
 */
import type { BridgeMessage, BridgeResponse, BridgeEvents } from './types'

export interface MockNativeOptions {
  bridgeVersion: string
  onMessage?: (msg: BridgeMessage) => void
}

const CHANNEL = '__mockNative'

export function setupMockNative({ bridgeVersion, onMessage }: MockNativeOptions) {
  window.webkit = {
    messageHandlers: {
      nativeBridge: { postMessage: (msg) => window.postMessage({ [CHANNEL]: msg }, '*') }
    }
  }

  window.addEventListener('message', (event) => {
    const msg: BridgeMessage | undefined = event.data?.[CHANNEL]
    if (!msg) return
    onMessage?.(msg)

    const reply = (res: Omit<BridgeResponse, 'callbackId'>) =>
      window.__bridgeCallback?.({ callbackId: msg.callbackId, ...res })

    // 模拟 Native 处理耗时
    setTimeout(() => {
      switch (msg.action) {
        case 'getBridgeInfo':
          return reply({ success: true, data: { bridgeVersion } })
        case 'getDeviceInfo':
          return reply({
            success: true,
            data: { platform: 'iOS', version: '17.4', model: 'iPhone 15 (Simulated)', appVersion: bridgeVersion }
          })
        case 'share':
          if (!msg.data?.url) return reply({ success: false, error: { code: 'INVALID_PARAMS', message: '缺少 url' } })
          console.log('[Mock Native] 分享内容:', msg.data)
          return reply({ success: true, data: { channel: 'wechat' } })
        case 'slowAction':
          return // 永不回调，用来演示超时
        default:
          return reply({ success: false, error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${msg.action}` } })
      }
    }, 200)
  })
}

/** Native 主动推送事件（真机上是 evaluateJavaScript("window.__bridgeEvent(...)")） */
export function emitNativeEvent<K extends keyof BridgeEvents>(event: K, data: BridgeEvents[K]) {
  window.__bridgeEvent?.(event, data)
}
