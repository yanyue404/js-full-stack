import type { ErrorRequestHandler } from 'express'
import { HttpError } from '../utils/httpError.js'

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code, requestId: req.id }
    })
    return
  }

  console.error(`[${req.id}] Unhandled error:`, err)
  res.status(500).json({
    error: { message: 'Internal Server Error', requestId: req.id }
  })
}
