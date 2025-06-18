/**
 * Global Error Handler Middleware
 * Handles all errors and sends appropriate responses
 */

import type { Request, Response, NextFunction } from "express"

// Custom error interface
interface CustomError extends Error {
  statusCode?: number
  code?: number
  keyValue?: any
  errors?: any
}

/**
 * Global error handling middleware
 */
export const errorHandler = (error: CustomError, req: Request, res: Response, next: NextFunction) => {
  let statusCode = error.statusCode || 500
  let message = error.message || "Internal Server Error"
  let details: any = null

  // Log error for debugging
  console.error("Error:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  })

  // Mongoose validation error
  if (error.name === "ValidationError") {
    statusCode = 400
    message = "Validation Error"
    details = Object.values(error.errors || {}).map((err: any) => ({
      field: err.path,
      message: err.message,
    }))
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    statusCode = 409
    message = "Duplicate field value"
    const field = Object.keys(error.keyValue || {})[0]
    details = {
      field,
      message: `${field} already exists`,
    }
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === "CastError") {
    statusCode = 400
    message = "Invalid ID format"
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401
    message = "Invalid authentication token"
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401
    message = "Authentication token expired"
  }

  // File upload errors
  if (error.message?.includes("File too large")) {
    statusCode = 413
    message = "File size too large"
  }

  // Rate limiting errors
  if (error.message?.includes("Too many requests")) {
    statusCode = 429
    message = "Too many requests, please try again later"
  }

  // Send error response
  const errorResponse: any = {
    error: message,
    status: statusCode,
  }

  // Add details in development mode
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = error.stack
    if (details) {
      errorResponse.details = details
    }
  } else if (details) {
    // Only add details in production for validation errors
    if (statusCode === 400 || statusCode === 409) {
      errorResponse.details = details
    }
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Route ${req.originalUrl} not found`) as CustomError
  error.statusCode = 404
  next(error)
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
