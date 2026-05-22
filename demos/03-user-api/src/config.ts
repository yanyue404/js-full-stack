export const config = {
  port: Number(process.env.PORT ?? 8080),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES ?? '15m',
  refreshTokenExpires: process.env.REFRESH_TOKEN_EXPIRES ?? '7d',
  bcryptRounds: 10
} as const
