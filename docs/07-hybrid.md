# 第七讲：混合应用与 WebView

> 理解 Web 与 Native 的交互边界，处理混合开发中的实际问题。

## 写在前面：前端工程师为什么要了解混合开发

如果你是一名前端工程师，你写的代码大概率已经在某个 App 的 WebView 里跑着了——只是你可能还不知道。

想想这些场景：

- 产品经理让你做一个**微信公众号里的活动页**，用户在微信里打开、在微信里分享
- 客户端同事找你联调，说"你的 H5 页面在我们 App 里白屏了"
- 测试同学报了一个 Bug："这个页面在浏览器里正常，但在 App 里表现不对"

这些都是混合开发的日常。你不需要成为 iOS / Android 开发者，但你需要理解**你的页面运行在什么"容器"里**，这个容器给了你什么能力、又有什么限制。

本讲的目标很明确：**让前端工程师能独立排查 H5 在 App 里的各种诡异问题**，并了解 Web 与 Native 之间是如何通信的。

---

## 1. 从你熟悉的场景开始理解

### 1.1 你已经在用混合开发了

你可能觉得"混合开发"离自己很远，但其实你每天都在接触：

```
你在微信里打开一个链接
           ↓
  微信打开了一个 WebView
           ↓
  你的 H5 页面在 WebView 里渲染
           ↓
  你点了"分享到朋友圈"
           ↓
  H5 通过微信 JS-SDK（JS Bridge）调用了微信的 Native 分享能力
```

翻译成技术语言：

| 你看到的                 | 技术本质                          |
| ------------------------ | --------------------------------- |
| 微信内置浏览器           | 一个 WebView 容器                 |
| 微信里打开的 H5 页面     | WebView 里运行的 Web 应用         |
| "分享到朋友圈"功能       | H5 通过 JS Bridge 调用 Native API |
| 微信 JS-SDK              | 一套封装好的 JS Bridge            |
| wx.scanQRCode()          | 调用手机摄像头（Native 能力）     |

**一句话总结：混合开发 = Web 页面跑在 Native 容器里，通过 Bridge 互相通信。**

### 1.2 三种移动应用架构

| 类型     | 技术                   | 优点             | 缺点             |
| -------- | ---------------------- | ---------------- | ---------------- |
| 原生应用 | Swift/Kotlin           | 性能最佳、体验好 | 开发成本高       |
| 混合应用 | WebView + Native Shell | 开发快、跨平台   | 性能受限         |
| 跨平台   | React Native / Flutter | 接近原生体验     | 复杂场景需写原生 |

作为前端工程师，我们主要关注的是第二种：**混合应用**。你写的 H5 页面就是混合应用的 Web 部分。

### 1.3 混合应用的适用场景

- 内容展示类页面（产品详情、活动页、H5 营销）
- 需要频繁更新的业务逻辑（不用发版、热更新）
- 多端复用的表单流程
- 嵌入到原生 App 内的 Web 模块

### 1.4 架构示意

```
┌───────────────────────────────────┐
│          Native App Shell         │
│                                   │
│   ┌───────────────────────────┐   │
│   │        WKWebView          │   │
│   │   ┌───────────────────┐   │   │
│   │   │                   │   │   │
│   │   │    H5 Web 页面    │   │   │
│   │   │   (Vue / React)   │   │   │
│   │   │                   │   │   │
│   │   └───────────────────┘   │   │
│   └───────────────────────────┘   │
│                                   │
│   ┌───────────────────────────┐   │
│   │       JS Bridge 通道      │   │
│   │   Web  ←──────→  Native   │   │
│   └───────────────────────────┘   │
│                                   │
│   原生能力：相机 / GPS / 推送 /   │
│   支付 / 通讯录 / 生物识别 ...    │
└───────────────────────────────────┘
```

---

## 2. H5 页面在不同"容器"中的表现差异

### 2.1 同一个页面，不同的表现

你写的同一个 H5 页面，在不同环境中的行为可能完全不同。这是前端开发中最常见的"坑"之一。

| 特性           | 普通浏览器       | 微信 WebView        | App WebView          | 小程序 WebView       |
| -------------- | ---------------- | -------------------- | -------------------- | -------------------- |
| JS API         | 完整支持         | 部分受限             | 取决于 App 实现      | 严格受限             |
| Cookie         | 正常             | 可能被清理           | 需 Native 注入       | 不支持               |
| 跳转行为       | 正常跳转         | 部分链接被拦截       | 自定义拦截规则       | 只能跳小程序页面     |
| 本地存储       | localStorage 正常 | 可能被清理           | 可能被清理           | 有容量限制           |
| 下载文件       | 正常下载         | 需长按识别或引导     | 需 Bridge 调用       | 不支持               |
| 分享           | 无原生分享       | wx.js-sdk 分享       | App Bridge 分享      | 小程序内置分享       |
| 返回按钮       | 浏览器后退       | 微信左上角返回       | App 自定义导航栏     | 小程序导航栏         |
| 视频自动播放   | 需用户交互       | 微信允许内联播放     | 取决于 WebView 配置  | 受限                 |

### 2.2 环境检测：判断你的页面跑在哪里

这是每个 H5 项目几乎都需要的基础工具函数：

```ts
type Environment = 'miniprogram' | 'wechat' | 'alipay' | 'app' | 'browser'

function detectEnvironment(): Environment {
  const ua = navigator.userAgent.toLowerCase()

  // 小程序 WebView（必须在微信判断之前，因为 UA 同时包含 micromessenger）
  if (ua.includes('miniprogram') || window.__wxjs_environment === 'miniprogram') {
    return 'miniprogram'
  }

  // 微信内置浏览器
  if (ua.includes('micromessenger')) return 'wechat'

  // 支付宝
  if (ua.includes('alipayclient')) return 'alipay'

  // 自家 App（需要和客户端约定 UA 标识）
  if (ua.includes('myappname')) return 'app'

  // 普通浏览器
  return 'browser'
}

// 使用示例
const env = detectEnvironment()
if (env === 'wechat') {
  // 初始化微信 JS-SDK
  initWxJsSdk()
} else if (env === 'app') {
  // 初始化 App Bridge
  initAppBridge()
}
```

> **实战经验：** 和客户端同事约定好自定义 UA 标识（如 `MyApp/2.0.0`），是判断 App 环境的最可靠方式。不要依赖 `window.xxx` 对象是否存在来判断——Bridge 注入可能有延迟。

---

## 3. 调试 WebView 中的 H5 页面

在浏览器里调试 H5 页面很简单，F12 就完事了。但在 WebView 里呢？

### 3.1 调试工具一览

```
调试场景               推荐工具              难度
─────────────────────────────────────────────────
iOS WebView           Safari 开发者工具      ★★☆
Android WebView       Chrome DevTools        ★★☆
微信 H5               微信开发者工具         ★☆☆
任意移动端 H5         vConsole               ★☆☆
网络请求抓包          Charles / Proxyman     ★★★
```

### 3.2 iOS：Safari 连接 WKWebView

**前置条件：**
- Mac + Safari（Windows 无法调试 iOS WebView）
- iPhone 需要开启 **设置 → Safari → 高级 → Web 检查器**
- App 必须是 Debug 包（正式包无法调试）

**步骤：**

```
1. iPhone 用数据线连接 Mac
2. Mac Safari → 开发 → [你的设备名]  → [你的页面]
3. 弹出 Web Inspector，和浏览器 DevTools 基本一致
```

> **注意：** 如果"开发"菜单没有出现，需要在 Safari → 偏好设置 → 高级 → 勾选"在菜单栏中显示开发菜单"。

### 3.3 Android：Chrome 远程调试

**步骤：**

```
1. Android 手机开启"开发者选项" + "USB 调试"
2. 用数据线连接电脑
3. Chrome 地址栏输入 chrome://inspect
4. 在 Remote Target 中找到你的 WebView 页面
5. 点击 "inspect" 打开 DevTools
```

> **前提：** App 的 WebView 必须开启了 `setWebContentsDebuggingEnabled(true)`，否则你在 chrome://inspect 里看不到它。正式环境一般会关闭，调试时需要用 Debug 包。

### 3.4 vConsole：移动端 H5 调试神器

当你无法连接 Safari / Chrome 调试时（比如在测试同事的手机上复现 Bug），vConsole 是救命稻草：

```bash
npm install vconsole
```

```ts
// 建议只在非生产环境启用
if (import.meta.env.DEV || location.search.includes('debug=1')) {
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole()
  })
}
```

vConsole 会在页面右下角显示一个绿色的 "vConsole" 按钮，点开后可以看到：

- **Log 面板：** console.log / warn / error 输出
- **Network 面板：** 所有网络请求（类似 DevTools 的 Network）
- **Element 面板：** DOM 结构查看
- **Storage 面板：** Cookie / localStorage / sessionStorage

> **生产环境调试技巧：** 在 URL 里加 `?debug=1` 参数来动态开启 vConsole，方便线上排查问题，又不影响普通用户。

### 3.5 网络抓包：Charles / Proxyman

有些问题光靠 Console 看不出来，需要抓包看完整的 HTTP 请求/响应：

```
手机设置 Wi-Fi 代理  →  指向电脑 IP + Charles 端口（如 8888）
                      →  Charles 可以看到所有 HTTP/HTTPS 请求
                      →  HTTPS 需要安装 Charles 根证书
```

**常见用途：**
- 查看 H5 页面在 App 里发出的真实请求（带 Cookie / Token）
- 检查接口返回数据是否正确
- 模拟弱网环境（Charles → Throttle）
- Map Local / Map Remote：将线上请求映射到本地文件调试

---

## 4. H5 适配实战经验

这一节是纯经验分享，都是前端在混合开发中高频遇到的问题。

### 4.1 Safe Area 适配（刘海屏 / 底部横条）

iPhone X 以后的机型有"安全区域"的概念。如果你的底部操作栏直接贴底，会被底部横条遮挡。

```css
/* 方式一：使用 env() 适配安全区域 */
.footer-bar {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 方式二：页面整体适配 */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

别忘了在 HTML 的 `<meta>` 标签里启用 `viewport-fit=cover`，否则 `env()` 不生效：

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 4.2 滚动穿透问题

弹窗或抽屉打开后，手指在弹层上滑动，背后的页面也跟着滚动——这就是滚动穿透。

```ts
// 方案一：弹层打开时锁定 body
function lockScroll() {
  document.body.style.overflow = 'hidden'
  document.body.style.position = 'fixed'
  document.body.style.width = '100%'
  document.body.style.top = `-${window.scrollY}px`
}

function unlockScroll() {
  const scrollY = document.body.style.top
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.top = ''
  window.scrollTo(0, parseInt(scrollY || '0') * -1)
}
```

```ts
// 方案二：使用 CSS overscroll-behavior（更推荐，但兼容性需确认）
// 给弹层的可滚动区域设置
.modal-content {
  overscroll-behavior: contain;
}
```

### 4.3 1px 边框问题

在高 DPR（设备像素比）的手机上，CSS 的 `1px` 看起来比设计稿更粗。

```scss
// 使用 transform 缩放实现真正的 1px
.border-bottom-1px {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 100%;
    height: 1px;
    background: #e5e5e5;
    transform: scaleY(0.5);
    transform-origin: 0 0;
  }
}
```

### 4.4 iOS 键盘弹出后页面不回弹

iOS 上输入框聚焦后键盘弹出，页面会被顶上去；但键盘收起后页面可能不会回到原位。

```ts
// 监听输入框失焦，手动滚动回正确位置
document.querySelectorAll('input, textarea').forEach((el) => {
  el.addEventListener('blur', () => {
    // iOS 键盘收起后，延迟滚动修复
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollTop, behavior: 'smooth' })
    }, 100)
  })
})
```

### 4.5 微信分享配置

在微信内置浏览器中，如果不主动配置分享信息，用户分享出去的卡片标题和图片是随机抓取的。

```ts
// 微信分享配置流程
// 1. 后端提供签名接口（前端不能直接暴露 AppSecret）
// 2. 前端用签名初始化 JS-SDK
// 3. 调用分享 API 设置分享内容

import wx from 'weixin-js-sdk'

async function setupWxShare(shareData: { title: string; desc: string; link: string; imgUrl: string }) {
  // 后端签名接口，传入当前页面 URL
  const { appId, timestamp, nonceStr, signature } = await fetch('/api/wx/signature', {
    method: 'POST',
    body: JSON.stringify({ url: location.href.split('#')[0] })
  }).then((res) => res.json())

  wx.config({
    debug: false,
    appId,
    timestamp,
    nonceStr,
    signature,
    jsApiList: ['updateAppMessageShareData', 'updateTimelineShareData']
  })

  wx.ready(() => {
    // 分享给朋友
    wx.updateAppMessageShareData({
      title: shareData.title,
      desc: shareData.desc,
      link: shareData.link,
      imgUrl: shareData.imgUrl
    })

    // 分享到朋友圈
    wx.updateTimelineShareData({
      title: shareData.title,
      link: shareData.link,
      imgUrl: shareData.imgUrl
    })
  })

  wx.error((err: any) => {
    console.error('微信 JS-SDK 配置失败', err)
  })
}
```

> **踩坑提示：**
> - 签名用的 URL 必须是**当前页面的完整 URL（不含 hash）**，SPA 应用在 iOS 上要特别注意用**第一次进入页面的 URL** 来签名
> - `imgUrl` 必须是完整的 HTTPS 地址，且图片大小建议不超过 32KB
> - 微信开发者工具可以模拟分享，但真实效果以手机为准

### 4.6 深色模式适配

越来越多的系统支持深色模式，H5 页面也需要考虑适配：

```css
/* 使用 CSS 媒体查询检测深色模式 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
    --border-color: #333;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-color: #ffffff;
    --text-color: #333333;
    --border-color: #e5e5e5;
  }
}
```

```ts
// JS 检测并监听深色模式变化
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

function handleThemeChange(e: MediaQueryListEvent | MediaQueryList) {
  document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
}

handleThemeChange(darkModeQuery)
darkModeQuery.addEventListener('change', handleThemeChange)
```

---

## 5. WKWebView 与 Web 页面交互

> 这一节涉及 iOS 原生代码（Swift）。作为前端工程师，你不需要能写这些代码，但**能读懂**会帮助你和客户端同事更高效地联调。

### 5.1 WKWebView 基础（Swift）

下面是 iOS 端创建一个 WebView 并加载 H5 页面的基本代码。注意第 4 行——`nativeBridge` 就是 Web 端用 `postMessage` 调用的那个"桥"的名字：

```swift
import WebKit

class WebViewController: UIViewController, WKNavigationDelegate {
    var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()

        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "nativeBridge")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.navigationDelegate = self
        view.addSubview(webView)

        let url = URL(string: "https://myapp.com/h5/home")!
        webView.load(URLRequest(url: url))
    }
}
```

### 5.2 Web → Native 通信

**Native 端（Swift）** 注册消息处理器，接收 Web 端发来的消息：

```swift
extension WebViewController: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String else { return }

        switch action {
        case "getDeviceInfo":
            let info = ["platform": "iOS", "version": UIDevice.current.systemVersion]
            callbackToWeb(data: info, callbackId: body["callbackId"] as? String)
        case "openCamera":
            openCamera()
        case "share":
            share(data: body["data"] as? [String: Any] ?? [:])
        default:
            break
        }
    }

    func callbackToWeb(data: Any, callbackId: String?) {
        guard let id = callbackId,
              let jsonData = try? JSONSerialization.data(withJSONObject: data),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        webView.evaluateJavaScript("window.__bridgeCallback('\(id)', \(jsonString))")
    }
}
```

**Web 端（TypeScript）** 调用 Native 方法。这段代码是前端需要写的部分：

```ts
function callNative(action: string, data?: Record<string, unknown>): Promise<unknown> {
  return new Promise((resolve) => {
    const callbackId = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`

    window.__bridgeCallback = (id: string, result: unknown) => {
      if (id === callbackId) resolve(result)
    }

    window.webkit?.messageHandlers?.nativeBridge?.postMessage({
      action,
      data,
      callbackId
    })
  })
}
```

通信流程示意：

```
Web 端                          Native 端 (iOS)
  │                                 │
  │  postMessage({action, data})    │
  │ ──────────────────────────────→ │
  │                                 │  处理请求（如获取设备信息）
  │                                 │
  │  evaluateJavaScript(callback)   │
  │ ←────────────────────────────── │
  │                                 │
  │  window.__bridgeCallback()      │
  │  Promise resolve                │
```

### 5.3 Native → Web 通信

Native 也可以主动向 Web 端推送消息（比如登录状态变化、网络状态变化）：

```swift
// Swift 端主动调用 Web 方法
webView.evaluateJavaScript("window.onNativeEvent('login', {userId: '123'})")
```

```ts
// Web 端监听 Native 推送的事件
window.onNativeEvent = (event: string, data: unknown) => {
  switch (event) {
    case 'login':
      handleLogin(data)
      break
    case 'networkChange':
      handleNetworkChange(data)
      break
  }
}
```

---

## 6. JS Bridge 原理与实现

### 6.1 统一 Bridge SDK

在实际项目中，你不会直接裸写 `postMessage`。通常会封装一个统一的 Bridge SDK，屏蔽 iOS / Android 的差异：

```ts
type BridgeCallback = (result: unknown) => void

class JSBridge {
  private callbacks = new Map<string, BridgeCallback>()
  private platform: 'ios' | 'android' | 'web'

  constructor() {
    this.platform = this.detectPlatform()
    this.setupGlobalCallback()
  }

  private detectPlatform() {
    if (window.webkit?.messageHandlers?.nativeBridge) return 'ios'
    if (window.AndroidBridge) return 'android'
    return 'web'
  }

  private setupGlobalCallback() {
    window.__bridgeCallback = (callbackId: string, result: unknown) => {
      const cb = this.callbacks.get(callbackId)
      if (cb) {
        cb(result)
        this.callbacks.delete(callbackId)
      }
    }
  }

  call<T = unknown>(action: string, data?: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      const callbackId = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const timeout = setTimeout(() => {
        this.callbacks.delete(callbackId)
        reject(new Error(`Bridge call "${action}" timed out`))
      }, 5000)

      this.callbacks.set(callbackId, (result) => {
        clearTimeout(timeout)
        resolve(result as T)
      })

      this.send({ action, data, callbackId })
    })
  }

  private send(message: Record<string, unknown>) {
    switch (this.platform) {
      case 'ios':
        window.webkit!.messageHandlers.nativeBridge.postMessage(message)
        break
      case 'android':
        window.AndroidBridge.postMessage(JSON.stringify(message))
        break
      default:
        console.warn('JSBridge: not in native environment', message)
    }
  }

  get isNative() {
    return this.platform !== 'web'
  }
}

export const bridge = new JSBridge()
```

### 6.2 使用示例

```ts
// 获取设备信息
const deviceInfo = await bridge.call<DeviceInfo>('getDeviceInfo')

// 打开原生相机
const photo = await bridge.call<{ url: string }>('openCamera')

// 分享
await bridge.call('share', {
  title: '分享标题',
  description: '分享描述',
  url: 'https://example.com'
})

// 检查是否在 Native 环境
if (bridge.isNative) {
  await bridge.call('setNavigationBar', { title: '页面标题', hidden: false })
}
```

---

## 7. URL Scheme 与 Deep Link

### 7.1 什么是 URL Scheme

你在浏览器里输入 `https://` 是打开网页，而输入 `weixin://` 是打开微信——这就是 URL Scheme。

```
常见 Scheme 示例：
  weixin://         → 打开微信
  alipay://         → 打开支付宝
  taobao://         → 打开淘宝
  myapp://page/home → 打开你的 App 并跳转到首页
```

**前端常见场景：** H5 支付完成后需要跳回 App、H5 活动页引导用户打开 App。

### 7.2 Universal Links 与 App Links

URL Scheme 有一个问题：如果用户没装 App，`myapp://xxx` 什么也不会发生（甚至可能报错）。

为了解决这个问题，iOS 和 Android 分别推出了更优雅的方案：

| 方案                     | 平台    | 原理                            |
| ------------------------ | ------- | ------------------------------- |
| Universal Links          | iOS     | HTTPS 链接直接打开 App          |
| App Links                | Android | HTTPS 链接直接打开 App          |

它们的共同特点是：**使用普通的 HTTPS 链接，如果 App 已安装就打开 App，未安装就正常打开网页**。对前端来说体验更好，不用担心兼容性问题。

### 7.3 实战：H5 尝试打开 App

```ts
/**
 * 尝试通过 URL Scheme 打开 App
 * 如果 2 秒内没有成功跳转（页面仍然可见），则跳转到下载页
 */
function openApp(scheme: string, fallbackUrl: string) {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = scheme
  document.body.appendChild(iframe)

  setTimeout(() => {
    document.body.removeChild(iframe)
    if (document.visibilityState !== 'hidden') {
      window.location.href = fallbackUrl
    }
  }, 2000)
}

// 使用示例
openApp('myapp://page/order?id=123', 'https://myapp.com/download')
```

> **为什么用 iframe？** 直接 `location.href = scheme` 会导致页面跳转，如果 App 没安装，用户会看到一个错误页面。用 iframe 可以避免这个问题。

> **更现代的方案：** 目前主流做法是使用 Universal Links / App Links，前端只需要用普通的 HTTPS 链接（如 `https://link.myapp.com/page/order?id=123`），由系统自动决定打开 App 还是打开网页。

---

## 8. Web ↔ Native 通信协议设计

当项目越来越大、Bridge 方法越来越多时，需要一套正式的协议来规范通信。

### 8.1 协议规范

```ts
interface BridgeMessage {
  action: string
  data?: Record<string, unknown>
  callbackId?: string
  version: string
}

interface BridgeResponse {
  callbackId: string
  success: boolean
  data?: unknown
  error?: { code: string; message: string }
}
```

### 8.2 版本兼容

不同版本的 App 支持不同的 Bridge 方法。前端需要在调用前检查当前 App 版本是否支持该方法：

```ts
class VersionedBridge extends JSBridge {
  private nativeVersion: string | null = null

  async init() {
    if (this.isNative) {
      const info = await this.call<{ bridgeVersion: string }>('getBridgeInfo')
      this.nativeVersion = info.bridgeVersion
    }
  }

  supports(action: string): boolean {
    const requirements: Record<string, string> = {
      openCamera: '1.0.0',
      biometricAuth: '2.0.0',
      pushNotification: '2.1.0'
    }
    if (!this.nativeVersion) return false
    return this.compareVersion(this.nativeVersion, requirements[action] || '1.0.0') >= 0
  }

  private compareVersion(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    for (let i = 0; i < 3; i++) {
      if ((parts1[i] || 0) !== (parts2[i] || 0)) {
        return (parts1[i] || 0) - (parts2[i] || 0)
      }
    }
    return 0
  }
}
```

---

## 9. 性能优化：WebView 加载优化

### 9.1 为什么 WebView 里的 H5 比浏览器里更慢

打开同一个 H5 页面，在 App WebView 里通常比在浏览器里慢 1-3 秒。原因：

```
浏览器打开 H5：
  打开浏览器（已启动） → 加载页面
  ─────────────────────────────→

App WebView 打开 H5：
  初始化 WebView 进程 → 创建 WebView → DNS / 建连 → 加载页面
  ──────────────────────────────────────────────────────────→
  ^                     ^
  多出的耗时             多出的耗时
```

WebView 需要先初始化（创建内核进程、分配内存），这一步在浏览器里是已经完成的。

### 9.2 优化方案总览

```
优化手段               效果     前端可做    需客户端配合
─────────────────────────────────────────────────────
WebView 预热          ★★★★★    ✗           ✓
离线包方案            ★★★★★    部分        ✓
首屏 SSR              ★★★★☆    ✓           ✗
骨架屏                ★★★☆☆    ✓           ✗
关键 CSS 内联         ★★★☆☆    ✓           ✗
图片 WebP + 懒加载    ★★★☆☆    ✓           ✗
代码分割 + 预加载     ★★★☆☆    ✓           ✗
接口预请求            ★★★★☆    部分        ✓
```

### 9.3 WebView 预热

原理：App 启动时提前创建一个空的 WebView 实例"暖"着，用户点击进入 H5 页面时直接复用，跳过初始化耗时。

这部分需要客户端配合，前端只需要知道这个概念即可：

```swift
// iOS 端在 App 启动时预创建 WebView（仅供理解）
class WebViewPool {
    static let shared = WebViewPool()
    private var pool: [WKWebView] = []

    func preload() {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.loadHTMLString("", baseURL: nil)
        pool.append(webView)
    }

    func dequeue() -> WKWebView? {
        return pool.isEmpty ? nil : pool.removeFirst()
    }
}
```

### 9.4 离线包方案

将 H5 的静态资源（HTML / CSS / JS / 图片）提前下载到 App 本地，WebView 加载时直接读本地文件，跳过网络请求。

```
传统加载流程：
  WebView → 请求 HTML → 请求 CSS / JS → 请求图片 → 渲染
  （每一步都是网络请求，受网速影响）

离线包加载流程：
  App 后台下载资源包 → 解压到本地
  WebView → 读本地 HTML → 读本地 CSS / JS → 读本地图片 → 渲染
  （全部是本地 IO，毫秒级）
```

**前端需要做的：**

```ts
// vite.config.ts - 确保构建产物有 hash，方便离线包做增量更新
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
})
```

### 9.5 前端可以独立做的优化

**骨架屏：** 在 JS 加载完成前先展示页面骨架，减少白屏感知时间。

```html
<!-- index.html 中直接内联骨架屏 -->
<div id="app">
  <div class="skeleton">
    <div class="skeleton-header"></div>
    <div class="skeleton-content">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
    </div>
  </div>
</div>
```

```css
/* 骨架屏样式也直接内联在 index.html 的 <style> 中 */
.skeleton-line {
  height: 16px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 12px;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**图片优化：**

```ts
// WebP 格式检测 + 降级
function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img.width > 0 && img.height > 0)
    img.onerror = () => resolve(false)
    img.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA'
  })
}

// 搭配 <picture> 标签实现自动降级
// <picture>
//   <source srcset="image.webp" type="image/webp" />
//   <img src="image.png" alt="fallback" loading="lazy" />
// </picture>
```

---

## 10. iOS / Swift / SwiftUI 基础

> 这一节是"能读懂"级别的速览。你不需要记住语法，但当你看到客户端的代码或联调文档时，能快速理解意思。

### 10.1 Swift 速览

```swift
// 变量与常量
let name: String = "Alice"
var count = 0

// 可选类型
var email: String? = nil
if let email = email {
    print(email)
}

// 结构体
struct User {
    let id: String
    var name: String
    var email: String
}

// 枚举
enum LoadingState {
    case idle, loading, success(Data), failure(Error)
}

// 闭包
let numbers = [3, 1, 4, 1, 5]
let sorted = numbers.sorted { $0 < $1 }

// async/await
func fetchUser() async throws -> User {
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}
```

**和 TypeScript 的类比：**

| Swift                    | TypeScript              | 说明                   |
| ------------------------ | ----------------------- | ---------------------- |
| `let`                    | `const`                 | 常量                   |
| `var`                    | `let`                   | 变量                   |
| `String?`                | `string \| null`        | 可选类型               |
| `struct`                 | `interface` / `type`    | 数据结构               |
| `enum`                   | `enum` / union type     | 枚举                   |
| `{ $0 < $1 }`           | `(a, b) => a < b`       | 闭包 / 箭头函数        |
| `async throws`           | `async` (throws Error)  | 异步函数               |

### 10.2 SwiftUI 速览

```swift
import SwiftUI

struct ContentView: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 20) {
            Text("Count: \(count)")
                .font(.title)

            Button("Increment") {
                count += 1
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}
```

如果你用过 React，你会觉得 SwiftUI 看起来很熟悉：`@State` ≈ `useState`，`View` ≈ 组件，`body` ≈ `render`。

### 10.3 作为全栈前端需要掌握的 iOS 知识

- 能读懂 WKWebView 相关的 Swift 代码
- 能修改 JS Bridge 的 Native 端实现
- 理解 App 生命周期对 WebView 的影响（App 进后台时 WebView 可能被暂停或回收）
- 了解 App Store 审核对 Web 内容的限制（如不允许 H5 实现核心功能绕过审核）

---

## 11. 常见问题与解决方案

### 11.1 白屏问题

| 原因             | 排查方法                  | 解决方案                          |
| ---------------- | ------------------------- | --------------------------------- |
| JS 加载失败      | Safari 开发者工具查看网络 | CDN 兜底、离线包                  |
| 页面报错         | 查看 Console 错误         | 全局错误捕获 + 降级页面           |
| WebView 初始化慢 | 测量 `webView:didFinish:` | WebView 预热、骨架屏              |
| SSL 证书问题     | 检查证书链                | 配置 ATS（App Transport Security）|

**前端兜底方案：**

```ts
// 全局错误捕获，白屏时展示降级页面
window.addEventListener('error', (e) => {
  // 脚本加载失败
  if (e.target && (e.target as HTMLElement).tagName === 'SCRIPT') {
    showFallbackPage('资源加载失败，请检查网络后刷新重试')
  }
})

window.addEventListener('unhandledrejection', (e) => {
  console.error('未处理的 Promise 异常', e.reason)
})
```

### 11.2 缓存管理

WebView 的缓存策略可能和浏览器不同，有时候你已经更新了代码，但用户看到的还是旧版本。

**Native 端清理缓存：**

```swift
// 清理 WebView 缓存
let dataStore = WKWebsiteDataStore.default()
let types = WKWebsiteDataStore.allWebsiteDataTypes()
dataStore.removeData(ofTypes: types, modifiedSince: Date.distantPast) {
    print("Cache cleared")
}
```

**前端端构建产物 hash 化（最重要的手段）：**

```ts
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
})
```

### 11.3 Cookie 与登录态同步

在 App 内的 H5 页面需要登录态时，通常由 Native 端把 Token 注入到 WebView 的 Cookie 中：

```swift
// Native 注入 Cookie 到 WebView
let cookie = HTTPCookie(properties: [
    .domain: ".myapp.com",
    .path: "/",
    .name: "token",
    .value: userToken,
    .secure: "TRUE"
])!

webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie)
```

**前端的注意事项：**
- 不要假设 Cookie 一定存在，要做好降级（比如引导用户重新登录）
- 注意 Cookie 的 `domain` / `path` / `Secure` 属性是否和你的 H5 页面域名匹配
- SameSite 策略可能导致跨域 Cookie 丢失

### 11.4 键盘遮挡输入框

```ts
// Web 端处理 iOS 键盘弹起
function handleKeyboard() {
  const originalHeight = window.innerHeight

  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight
    if (currentHeight < originalHeight) {
      const activeElement = document.activeElement as HTMLElement
      activeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}
```

---

## 12. 课堂练习

### 练习 7：实现 Web ↔ Native 双向通信 Demo

**目标：** 构建一个 Web 页面，通过 JS Bridge 与模拟的 Native 环境交互。

**要求：**

1. 实现 JSBridge SDK（支持 iOS / Android / Web fallback）
2. Web 页面：
   - 点击按钮调用 Native 获取设备信息
   - 点击按钮调用 Native 分享功能
   - 监听 Native 推送的事件
3. 模拟 Native 环境（在 Web 中用 iframe 模拟）
4. 处理超时和错误情况
5. 版本兼容检测

**验证标准：**

- [ ] Bridge SDK 能正确检测运行环境
- [ ] Web → Native 调用正常，有回调
- [ ] Native → Web 事件推送正常
- [ ] 超时场景有兜底处理
- [ ] 在真实 WKWebView 中测试通过（如有 Xcode 环境）

**参考代码：** 见 [demos/07-js-bridge](../demos/07-js-bridge)

---

## 推荐阅读

- [微信 JS-SDK 官方文档](https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/JS-SDK.html) —— 最常用的 JS Bridge 实践
- [vConsole GitHub](https://github.com/nicetip/vConsole) —— 移动端调试工具
- [WebView 性能优化 - 美团技术博客](https://tech.meituan.com/) —— 离线包、预热方案
- [Safari Web Inspector Guide](https://developer.apple.com/safari/tools/) —— iOS WebView 调试
- [Chrome Remote Debugging](https://developer.chrome.com/docs/devtools/remote-debugging/) —— Android WebView 调试
