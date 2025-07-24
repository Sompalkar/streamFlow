import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "../utils/jwt.util"
import User from "../models/User"

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        name: string
      }
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    const user = await User.findById(decoded.userId).select("-password")
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      })
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    }

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    })
  }
}

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)

      const user = await User.findById(decoded.userId).select("-password")
      if (user) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        }
      }
    }

    next()
  } catch (error) {
    // Continue without authentication
    next()
  }
}
