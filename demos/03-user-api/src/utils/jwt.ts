import jwt, { type SignOptions } from 'jsonwebtoken'
import { config } from '../config.js'
import type { TokenPayload } from '../types/index.js'

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.accessTokenExpires as SignOptions['expiresIn']
  })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.refreshTokenExpires as SignOptions['expiresIn']
  })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload
}
