import { useEffect, useState } from 'react'

export interface AsyncState<T> {
  loading: boolean
  data: T | null
  error: Error | null
}

export function useAsync<T>(asyncFn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    data: null,
    error: null
  })

  useEffect(() => {
    let cancelled = false
    setState({ loading: true, data: null, error: null })

    asyncFn()
      .then((data) => {
        if (!cancelled) setState({ loading: false, data, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            loading: false,
            data: null,
            error: error instanceof Error ? error : new Error(String(error))
          })
        }
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return state
}
