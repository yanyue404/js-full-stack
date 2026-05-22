import type { Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService.js'
import { tokenService } from '../services/tokenService.js'
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js'
import { HttpError } from '../utils/httpError.js'
import type { LoginInput, RefreshInput, RegisterInput } from '../schemas/index.js'

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const input = req.body as RegisterInput
      const user = await userService.create(input)

      const accessToken = generateAccessToken({ userId: user.id, role: user.role })
      const refreshToken = generateRefreshToken({ userId: user.id, role: user.role })
      tokenService.saveRefreshToken(user.id, refreshToken)

      res.status(201).json({ user, accessToken, refreshToken })
    } catch (err) {
      next(err)
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body as LoginInput
      const user = await userService.findByEmail(email)
      if (!user) {
        throw new HttpError(401, 'Invalid email or password')
      }

      const valid = await userService.verifyPassword(user, password)
      if (!valid) {
        throw new HttpError(401, 'Invalid email or password')
      }

      const accessToken = generateAccessToken({ userId: user.id, role: user.role })
      const refreshToken = generateRefreshToken({ userId: user.id, role: user.role })
      tokenService.saveRefreshToken(user.id, refreshToken)

      res.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
        accessToken,
        refreshToken
      })
    } catch (err) {
      next(err)
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body as RefreshInput

      let payload
      try {
        payload = verifyToken(refreshToken)
      } catch {
        throw new HttpError(401, 'Invalid refresh token')
      }

      if (!tokenService.isRefreshTokenValid(payload.userId, refreshToken)) {
        throw new HttpError(401, 'Refresh token revoked')
      }

      const accessToken = generateAccessToken(payload)
      res.json({ accessToken })
    } catch (err) {
      next(err)
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new HttpError(401, 'Unauthorized')
      }
      tokenService.revokeRefreshToken(req.user.userId)
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
}
