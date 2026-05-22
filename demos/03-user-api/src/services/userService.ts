import bcrypt from 'bcrypt'
import crypto from 'node:crypto'
import { store } from '../db/store.js'
import { config } from '../config.js'
import { HttpError } from '../utils/httpError.js'
import type { Role, SafeUser, User } from '../types/index.js'

function toSafe(user: User): SafeUser {
  const { passwordHash: _ph, deletedAt: _dt, ...safe } = user
  void _ph
  void _dt
  return safe
}

function isAlive(user: User): boolean {
  return user.deletedAt === undefined
}

export const userService = {
  async create(input: {
    email: string
    password: string
    name: string
    role?: Role
  }): Promise<SafeUser> {
    const exists = [...store.users.values()].find(
      (u) => u.email === input.email && isAlive(u)
    )
    if (exists) {
      throw new HttpError(409, 'Email already registered', 'EMAIL_EXISTS')
    }

    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds)
    const now = new Date()
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role ?? 'user',
      createdAt: now
    }
    store.users.set(user.id, user)
    return toSafe(user)
  },

  async findByEmail(email: string): Promise<User | undefined> {
    return [...store.users.values()].find((u) => u.email === email && isAlive(u))
  },

  async findById(id: string): Promise<SafeUser | null> {
    const user = store.users.get(id)
    if (!user || !isAlive(user)) return null
    return toSafe(user)
  },

  async findAll(params: { page: number; limit: number; search?: string }) {
    const all = [...store.users.values()].filter(isAlive)
    const filtered = params.search
      ? all.filter(
          (u) =>
            u.email.includes(params.search!) || u.name.includes(params.search!)
        )
      : all

    const total = filtered.length
    const start = (params.page - 1) * params.limit
    const items = filtered
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, start + params.limit)
      .map(toSafe)

    return {
      items,
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit)
      }
    }
  },

  async update(
    id: string,
    patch: { name?: string; email?: string }
  ): Promise<SafeUser | null> {
    const user = store.users.get(id)
    if (!user || !isAlive(user)) return null

    if (patch.email && patch.email !== user.email) {
      const dup = [...store.users.values()].find(
        (u) => u.email === patch.email && u.id !== id && isAlive(u)
      )
      if (dup) {
        throw new HttpError(409, 'Email already used', 'EMAIL_EXISTS')
      }
    }

    Object.assign(user, patch)
    return toSafe(user)
  },

  async softDelete(id: string): Promise<boolean> {
    const user = store.users.get(id)
    if (!user || !isAlive(user)) return false
    user.deletedAt = new Date()
    return true
  },

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash)
  }
}
