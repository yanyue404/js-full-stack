import { JSBridge } from './JSBridge'
import { setupMockNative } from './mockNative'
import type { BridgeMessage } from './types'

/** 通过 URL 切换环境：?native=1&v=1.0.0 模拟旧版 App；不带参数即普通浏览器 */
const params = new URLSearchParams(location.search)
export const mockVersion = params.get('v') ?? '1.2.0'
export const nativeLog: BridgeMessage[] = []

if (params.get('native') === '1') {
  setupMockNative({ bridgeVersion: mockVersion, onMessage: (m) => nativeLog.push(m) })
}

export const bridge = new JSBridge()
export { BridgeError } from './JSBridge'
