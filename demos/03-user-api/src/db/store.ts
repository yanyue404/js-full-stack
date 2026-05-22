import type { User } from '../types/index.js'

class InMemoryStore {
  users = new Map<string, User>()
  refreshTokens = new Map<string, Set<string>>()
}

export const store = new InMemoryStore()
