/**
 * 结构化食谱页 — 普通 fetch 调用 /api/recipe，演示 generateObject 的非流式场景。
 * 类型 Recipe 应与后端 api/src/routes/recipe.ts 的 zod schema 保持一致。
 */
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

const DIFFICULTY_CLASS: Record<Recipe['difficulty'], string> = {
  简单: 'easy',
  中等: 'medium',
  困难: 'hard'
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
      <section className="recipe-intro">
        <p className="recipe-lead">
          后端用 <code>generateObject + zod schema</code> 让模型输出严格结构化的食谱 JSON，前端直接消费类型安全的数据。
        </p>
      </section>

      <form className="recipe-form" onSubmit={handleSubmit}>
        <input
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="想做什么菜？例如 麻婆豆腐"
          disabled={loading}
          aria-label="菜名"
        />
        <button type="submit" className="btn btn-send" disabled={loading || !dish.trim()}>
          {loading ? '生成中...' : '生成食谱'}
        </button>
      </form>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {data && (
        <article className="recipe-card">
          <div className="recipe-card-head">
            <div>
              <p className="recipe-model">by {data.model}</p>
              <h3 className="recipe-name">{data.recipe.name}</h3>
              <p className="recipe-cuisine">{data.recipe.cuisine}</p>
            </div>
            <div className="recipe-meta">
              <span className={`recipe-tag ${DIFFICULTY_CLASS[data.recipe.difficulty]}`}>
                {data.recipe.difficulty}
              </span>
              <span className="recipe-time">约 {data.recipe.cookingMinutes} 分钟</span>
            </div>
          </div>

          <div className="recipe-section">
            <h4>食材</h4>
            <ul className="recipe-ingredients">
              {data.recipe.ingredients.map((it, idx) => (
                <li key={idx}>
                  <span>{it.name}</span>
                  <span>{it.amount}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="recipe-section">
            <h4>步骤</h4>
            <ol className="recipe-steps">
              {data.recipe.steps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>

          <details className="recipe-raw">
            <summary>查看原始 JSON</summary>
            <pre>{JSON.stringify(data.recipe, null, 2)}</pre>
          </details>
        </article>
      )}
    </div>
  )
}
