export type Platform = 'ios' | 'android' | 'web'

/** Web → Native */
export interface BridgeMessage {
  action: string
  data?: Record<string, unknown>
  callbackId: string
  version: string
}

/** Native → Web（回调） */
export interface BridgeResponse<T = unknown> {
  callbackId: string
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

export interface DeviceInfo {
  platform: string
  version: string
  model: string
  appVersion: string
}

export interface ShareParams {
  title: string
  description?: string
  url: string
  image?: string
}

/** Native 主动推送的事件 */
export interface BridgeEvents {
  networkChange: { type: 'wifi' | '4g' | 'offline' }
  loginStateChange: { isLoggedIn: boolean; userId?: string }
}

export interface CallOptions {
  timeout?: number
}

declare global {
  interface Window {
    webkit?: { messageHandlers?: { nativeBridge?: { postMessage(msg: BridgeMessage): void } } }
    AndroidBridge?: { postMessage(json: string): void }
    __bridgeCallback?: (response: BridgeResponse) => void
    __bridgeEvent?: (event: string, data: unknown) => void
  }
}
