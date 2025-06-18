/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 */

import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import User from "../models/User"

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        email: string
        name: string
      }
    }
  }
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: "Access denied",
        message: "No authentication token provided",
      })
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: string }

    // Find user
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        error: "Invalid token",
        message: "User not found",
      })
    }

    // Attach user info to request
    req.user = {
      userId: user._id,
      email: user.email,
      name: user.name,
    }

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Authentication token is invalid",
      })
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Token expired",
        message: "Authentication token has expired",
      })
    }

    console.error("Authentication error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "Authentication failed",
    })
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user info if token is provided, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: string }
      const user = await User.findById(decoded.userId)

      if (user) {
        req.user = {
          userId: user._id,
          email: user.email,
          name: user.name,
        }
      }
    }

    next()
  } catch (error) {
    // Continue without authentication if token is invalid
    next()
  }
}
