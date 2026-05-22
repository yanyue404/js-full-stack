export type Role = 'admin' | 'user'

export interface User {
  id: string
  email: string
  name: string
  passwordHash: string
  role: Role
  createdAt: Date
  deletedAt?: Date
}

export type SafeUser = Omit<User, 'passwordHash' | 'deletedAt'>

export interface TokenPayload {
  userId: string
  role: Role
}

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

declare global {
  namespace Express {
    interface Request {
      id?: string
      user?: TokenPayload
    }
  }
}
