import { store } from '../db/store.js'

export const tokenService = {
  saveRefreshToken(userId: string, token: string): void {
    const set = store.refreshTokens.get(userId) ?? new Set<string>()
    set.add(token)
    store.refreshTokens.set(userId, set)
  },

  isRefreshTokenValid(userId: string, token: string): boolean {
    return store.refreshTokens.get(userId)?.has(token) ?? false
  },

  revokeRefreshToken(userId: string, token?: string): void {
    if (!token) {
      store.refreshTokens.delete(userId)
      return
    }
    store.refreshTokens.get(userId)?.delete(token)
  }
}
