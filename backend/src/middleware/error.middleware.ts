/**
 * Error Handling Middleware
 * Centralized error handling for the application
 */

import type { Request, Response, NextFunction } from "express"
import type { ErrorResponse } from "@/types"

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Global error handling middleware
 * Catches all errors and formats them consistently
 */
export const errorHandler = (error: Error | AppError, req: Request, res: Response, next: NextFunction): void => {
  console.error("Error occurred:", {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  })

  // Default error response
  let errorResponse: ErrorResponse = {
    error: "Internal server error",
    message: "An unexpected error occurred",
  }

  let statusCode = 500

  // Handle different types of errors
  if (error instanceof AppError) {
    // Custom application errors
    statusCode = error.statusCode
    errorResponse = {
      error: error.name || "Application error",
      message: error.message,
    }
  } else if (error.name === "ValidationError") {
    // Mongoose validation errors
    statusCode = 400
    errorResponse = {
      error: "Validation failed",
      message: "Data validation failed",
      details: Object.values((error as any).errors).map((err: any) => ({
        field: err.path,
        message: err.message,
      })),
    }
  } else if (error.name === "CastError") {
    // Mongoose cast errors (invalid ObjectId, etc.)
    statusCode = 400
    errorResponse = {
      error: "Invalid data format",
      message: "Invalid ID format",
    }
  } else if (error.name === "MongoServerError" && (error as any).code === 11000) {
    // MongoDB duplicate key errors
    statusCode = 409
    const field = Object.keys((error as any).keyValue)[0]
    errorResponse = {
      error: "Duplicate entry",
      message: `${field} already exists`,
    }
  } else if (error.name === "MulterError") {
    // File upload errors
    statusCode = 400
    errorResponse = {
      error: "File upload error",
      message: error.message,
    }
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    errorResponse.message = "Something went wrong"
  }

  res.status(statusCode).json(errorResponse)
}

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    error: "Route not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
  }

  res.status(404).json(errorResponse)
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
