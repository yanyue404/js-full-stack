import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'
import type { Role } from '../db/schema.js'
import { HttpError } from './errors.js'

export interface AuthUser {
  userId: string
  workspaceId: string
  role: Role
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

// ponytail: 单 Access Token（8 小时），需要无感续期时升级为双 Token 轮换（见 prototype/03-node-auth.html）
export function signToken(user: AuthUser) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn, algorithm: 'HS256' })
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.get('authorization')
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, '未登录', 'UNAUTHORIZED')
  try {
    const { userId, workspaceId, role } = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ['HS256']
    }) as AuthUser
    req.user = { userId, workspaceId, role }
    next()
  } catch (err) {
    const expired = (err as Error).name === 'TokenExpiredError'
    throw new HttpError(401, expired ? '登录已过期' : '无效的令牌', expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED')
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw new HttpError(403, '权限不足', 'FORBIDDEN')
    next()
  }
}

/** 已通过 requireAuth 的路由里取当前用户 */
export const currentUser = (req: Request) => req.user!
