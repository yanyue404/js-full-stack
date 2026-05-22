import { Router } from 'express'
import { userController } from '../controllers/userController.js'
import { authMiddleware, requireOwnerOrAdmin, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { listQuerySchema, updateUserSchema } from '../schemas/index.js'

const usersRouter = Router()

usersRouter.get('/', authMiddleware, validate(listQuerySchema, 'query'), userController.list)

usersRouter.get('/:id', authMiddleware, userController.getById)

usersRouter.patch(
  '/:id',
  authMiddleware,
  requireOwnerOrAdmin((req) => req.params.id),
  validate(updateUserSchema),
  userController.update
)

usersRouter.delete('/:id', authMiddleware, requireRole('admin'), userController.remove)

export default usersRouter
