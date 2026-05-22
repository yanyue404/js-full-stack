import type { Request, Response, NextFunction } from 'express'
import { userService } from '../services/userService.js'
import { HttpError } from '../utils/httpError.js'
import type { ListQueryInput, UpdateUserInput } from '../schemas/index.js'

export const userController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as ListQueryInput
      const result = await userService.findAll(query)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.findById(req.params.id)
      if (!user) throw new HttpError(404, 'User not found')
      res.json(user)
    } catch (err) {
      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const patch = req.body as UpdateUserInput
      const updated = await userService.update(req.params.id, patch)
      if (!updated) throw new HttpError(404, 'User not found')
      res.json(updated)
    } catch (err) {
      next(err)
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await userService.softDelete(req.params.id)
      if (!ok) throw new HttpError(404, 'User not found')
      res.status(204).end()
    } catch (err) {
      next(err)
    }
  }
}
