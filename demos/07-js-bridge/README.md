# 练习 7：Web ↔ Native 双向通信 Demo

构建一个 Web 页面，通过 JS Bridge 与模拟的 Native 环境交互。

## 目标

掌握混合应用中 Web 与 Native 的通信机制，实现一套可复用的 JSBridge SDK。即使没有 Xcode 环境，也可以通过模拟方式理解完整流程。

## 要求

1. 实现 JSBridge SDK（支持 iOS / Android / Web fallback）
2. Web 页面：调用 Native 获取设备信息、分享、监听事件
3. 模拟 Native 环境（用 iframe + postMessage 模拟）
4. 处理超时和错误情况
5. 版本兼容检测

## 快速开始

```bash
pnpm create vite js-bridge-demo --template react-ts
cd js-bridge-demo
pnpm install
pnpm dev
```

## 项目结构

```
src/
├── bridge/
│   ├── JSBridge.ts          # 核心 Bridge SDK
│   ├── types.ts             # 类型定义
│   └── mockNative.ts        # 模拟 Native 环境
├── components/
│   ├── DeviceInfo.tsx       # 获取设备信息示例
│   ├── ShareButton.tsx      # 调用分享示例
│   └── EventListener.tsx    # 监听 Native 事件示例
├── App.tsx
└── main.tsx
```

## JSBridge SDK 接口设计

```ts
interface JSBridge {
  // 检测运行环境
  readonly platform: 'ios' | 'android' | 'web'
  readonly isNative: boolean

  // 调用 Native 方法（带超时）
  call<T>(action: string, data?: Record<string, unknown>): Promise<T>

  // 检查 Native 是否支持某个方法
  supports(action: string): boolean

  // 监听 Native 推送的事件
  on(event: string, handler: (data: unknown) => void): void
  off(event: string, handler: (data: unknown) => void): void
}
```

## 需要实现的功能

### 功能 1：获取设备信息

```ts
// Web 端调用
const info = await bridge.call<DeviceInfo>('getDeviceInfo')
// 返回：{ platform: 'iOS', version: '17.4', model: 'iPhone 15' }
```

### 功能 2：调用分享

```ts
await bridge.call('share', {
  title: '分享标题',
  description: '分享描述',
  url: 'https://example.com',
  image: 'https://example.com/cover.jpg'
})
```

### 功能 3：监听 Native 事件

```ts
// 监听网络状态变化
bridge.on('networkChange', (data) => {
  console.log('网络状态:', data) // { type: 'wifi' | '4g' | 'offline' }
})

// 监听登录状态变化
bridge.on('loginStateChange', (data) => {
  console.log('登录状态:', data) // { isLoggedIn: true, userId: '123' }
})
```

### 功能 4：超时处理

```ts
try {
  const result = await bridge.call('slowAction', {}, { timeout: 3000 })
} catch (error) {
  if (error.message.includes('timed out')) {
    console.log('Native 响应超时，使用降级方案')
  }
}
```

## 模拟 Native 环境

在没有 Xcode / Android Studio 的情况下，用 iframe + postMessage 模拟 Native 端：

```ts
// mockNative.ts — 在 Web 中模拟 Native 的行为
export function setupMockNative() {
  window.addEventListener('message', (event) => {
    const { action, callbackId, data } = event.data

    // 模拟 Native 处理延迟
    setTimeout(() => {
      let result: unknown

      switch (action) {
        case 'getDeviceInfo':
          result = { platform: 'Mock iOS', version: '17.4', model: 'iPhone 15 (Simulated)' }
          break
        case 'share':
          result = { success: true }
          console.log('[Mock Native] 分享内容:', data)
          break
        default:
          result = { error: `Unknown action: ${action}` }
      }

      // 回调给 Web
      window.__bridgeCallback?.(callbackId, result)
    }, 200)
  })
}
```

## 验证标准

- [ ] Bridge SDK 能正确检测运行环境（web / ios / android）
- [ ] Web → Native 调用正常，有回调返回
- [ ] Native → Web 事件推送正常（模拟网络变化事件）
- [ ] 超时场景正确触发 reject（设置 1ms 超时测试）
- [ ] Web 环境下有 fallback 提示（"当前不在 Native 环境"）
- [ ] 版本兼容检测能正确判断功能是否可用
- [ ] 代码无 TypeScript 报错

## 提示

- `window.webkit?.messageHandlers` 存在说明在 iOS WKWebView 中
- 模拟环境下，把 bridge 的 `send` 方法改为 `window.postMessage`
- 事件监听可以用浏览器的 `CustomEvent` 模拟
- 超时用 `Promise.race([callPromise, timeoutPromise])` 实现
- 如果有 Xcode，可以创建一个简单的 SwiftUI App 内嵌 WKWebView 做真机测试
