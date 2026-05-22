import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authController } from '../controllers/authController.js'
import { authMiddleware } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { loginSchema, refreshSchema, registerSchema } from '../schemas/index.js'

const authRouter = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})

authRouter.post('/register', authLimiter, validate(registerSchema), authController.register)
authRouter.post('/login', authLimiter, validate(loginSchema), authController.login)
authRouter.post('/refresh', validate(refreshSchema), authController.refresh)
authRouter.post('/logout', authMiddleware, authController.logout)

export default authRouter
