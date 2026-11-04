import { useState } from 'react'
import { bridge } from '../bridge'
import type { DeviceInfo as Info } from '../bridge/types'

export function DeviceInfo() {
  const [info, setInfo] = useState<Info | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      setInfo(await bridge.call<Info>('getDeviceInfo'))
    } catch (e) {
      // 降级：Web 环境用 UA 粗略判断
      setInfo(null)
      setError(`${(e as Error).message}（UA: ${navigator.userAgent.slice(0, 60)}…）`)
    }
  }

  return (
    <section>
      <h2>获取设备信息</h2>
      <button onClick={load}>bridge.call('getDeviceInfo')</button>
      {info && (
        <dl>
          {Object.entries(info).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {error && <p className="warn">{error}</p>}
    </section>
  )
}
