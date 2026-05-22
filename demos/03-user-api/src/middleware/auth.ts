import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import type { Role } from '../types/index.js'

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    req.user = verifyToken(token)
    next()
  } catch (err) {
    const error = err as Error
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
      return
    }
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}

export function requireOwnerOrAdmin(getOwnerId: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (req.user.role === 'admin') {
      next()
      return
    }
    const ownerId = getOwnerId(req)
    if (ownerId !== req.user.userId) {
      res.status(403).json({ error: 'You can only modify your own resources' })
      return
    }
    next()
  }
}
