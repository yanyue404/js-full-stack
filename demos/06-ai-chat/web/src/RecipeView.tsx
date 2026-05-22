import { useState, type FormEvent } from 'react'

interface Recipe {
  name: string
  cuisine: string
  difficulty: '简单' | '中等' | '困难'
  cookingMinutes: number
  ingredients: { name: string; amount: string }[]
  steps: string[]
}

interface RecipeResponse {
  model: string
  recipe: Recipe
}

export function RecipeView() {
  const [dish, setDish] = useState('番茄炒蛋')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RecipeResponse | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish })
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setData((await res.json()) as RecipeResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="recipe">
      <h2 style={{ margin: 0 }}>结构化输出演示</h2>
      <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
        后端用 <code>generateObject + zod schema</code> 让模型输出严格结构化的食谱 JSON。
      </p>
      <form onSubmit={handleSubmit}>
        <input
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="想做什么菜？例如 麻婆豆腐"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !dish.trim()}>
          {loading ? '生成中...' : '生成食谱'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>by {data.model}</div>
          <h3 style={{ margin: 0 }}>
            {data.recipe.name} · {data.recipe.cuisine}
          </h3>
          <div style={{ fontSize: 13, color: '#374151' }}>
            难度：{data.recipe.difficulty} · 用时约 {data.recipe.cookingMinutes} 分钟
          </div>
          <div>
            <strong>食材：</strong>
            <ul>
              {data.recipe.ingredients.map((it, idx) => (
                <li key={idx}>
                  {it.name} · {it.amount}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong>步骤：</strong>
            <ol>
              {data.recipe.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
          <details>
            <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: 13 }}>
              查看原始 JSON
            </summary>
            <pre>{JSON.stringify(data.recipe, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  )
}
