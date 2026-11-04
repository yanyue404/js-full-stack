import type { BridgeEvents, BridgeMessage, BridgeResponse, CallOptions, Platform } from './types'

const SDK_VERSION = '1.0.0'
const DEFAULT_TIMEOUT = 5000

/** 各方法要求的最低 Native Bridge 版本 */
const REQUIREMENTS: Record<string, string> = {
  getDeviceInfo: '1.0.0',
  share: '1.0.0',
  slowAction: '1.0.0',
  openCamera: '1.1.0',
  biometricAuth: '2.0.0'
}

export function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}

export class BridgeError extends Error {
  constructor(
    public code: 'TIMEOUT' | 'NOT_NATIVE' | 'UNSUPPORTED' | 'NATIVE_ERROR',
    message: string
  ) {
    super(message)
  }
}

type Handler = (data: unknown) => void

export class JSBridge {
  readonly platform: Platform
  private pending = new Map<string, (res: BridgeResponse) => void>()
  private listeners = new Map<string, Set<Handler>>()
  private nativeVersion: string | null = null
  private seq = 0

  constructor() {
    this.platform = JSBridge.detect()
    window.__bridgeCallback = (res) => {
      this.pending.get(res.callbackId)?.(res)
      this.pending.delete(res.callbackId)
    }
    window.__bridgeEvent = (event, data) => {
      this.listeners.get(event)?.forEach((fn) => fn(data))
    }
  }

  static detect(): Platform {
    if (window.webkit?.messageHandlers?.nativeBridge) return 'ios'
    if (window.AndroidBridge) return 'android'
    return 'web'
  }

  get isNative() {
    return this.platform !== 'web'
  }

  get bridgeVersion() {
    return this.nativeVersion
  }

  /** 启动时拿到 Native 的 Bridge 版本，用于 supports() 判断 */
  async init() {
    if (!this.isNative) return
    const info = await this.call<{ bridgeVersion: string }>('getBridgeInfo', undefined, { timeout: 2000 })
    this.nativeVersion = info.bridgeVersion
  }

  supports(action: string): boolean {
    if (!this.nativeVersion) return false
    return compareVersion(this.nativeVersion, REQUIREMENTS[action] ?? '1.0.0') >= 0
  }

  call<T = unknown>(action: string, data?: Record<string, unknown>, opts: CallOptions = {}): Promise<T> {
    if (!this.isNative) {
      return Promise.reject(new BridgeError('NOT_NATIVE', '当前不在 Native 环境，请使用 Web 降级方案'))
    }
    if (action !== 'getBridgeInfo' && this.nativeVersion && !this.supports(action)) {
      return Promise.reject(
        new BridgeError('UNSUPPORTED', `"${action}" 需要 Bridge ${REQUIREMENTS[action]}，当前 ${this.nativeVersion}`)
      )
    }

    const callbackId = `cb_${Date.now()}_${++this.seq}`
    const timeout = opts.timeout ?? DEFAULT_TIMEOUT

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(callbackId)
        reject(new BridgeError('TIMEOUT', `Bridge call "${action}" timed out after ${timeout}ms`))
      }, timeout)

      this.pending.set(callbackId, (res) => {
        clearTimeout(timer)
        if (res.success) resolve(res.data as T)
        else reject(new BridgeError('NATIVE_ERROR', res.error?.message ?? 'Native error'))
      })

      this.send({ action, data, callbackId, version: SDK_VERSION })
    })
  }

  on<K extends keyof BridgeEvents>(event: K, handler: (data: BridgeEvents[K]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(handler as Handler)
  }

  off<K extends keyof BridgeEvents>(event: K, handler: (data: BridgeEvents[K]) => void): void {
    this.listeners.get(event)?.delete(handler as Handler)
  }

  private send(msg: BridgeMessage) {
    if (this.platform === 'ios') window.webkit!.messageHandlers!.nativeBridge!.postMessage(msg)
    else window.AndroidBridge!.postMessage(JSON.stringify(msg))
  }
}
