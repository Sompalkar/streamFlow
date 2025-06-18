/**
 * Authentication Routes
 * Handles user registration, login, and authentication-related endpoints
 */

import express, { type Request, type Response } from "express"
import jwt from "jsonwebtoken"
import rateLimit from "express-rate-limit"
import { body, validationResult } from "express-validator"
import User from "../models/User"
import { authenticateToken } from "../middleware/auth"

const router = express.Router()

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Validation rules
const registerValidation = [
  body("name").trim().isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email address"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain at least one lowercase letter, one uppercase letter, and one number"),
]

const loginValidation = [
  body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email address"),
  body("password").notEmpty().withMessage("Password is required"),
]

/**
 * Generate JWT token
 */
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  })
}

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", authLimiter, registerValidation, async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { name, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
        message: "An account with this email address already exists",
      })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
    })

    await user.save()

    // Generate JWT token
    const token = generateToken(user._id)

    // Update last login
    user.lastLoginAt = new Date()
    await user.save()

    res.status(201).json({
      message: "User registered successfully",
      user: user.toJSON(),
      token,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to register user",
    })
  }
})

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post("/login", authLimiter, loginValidation, async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array(),
      })
    }

    const { email, password } = req.body

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Invalid credentials",
        message: "Email or password is incorrect",
      })
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Update last login
    user.lastLoginAt = new Date()
    await user.save()

    res.json({
      message: "Login successful",
      user: user.toJSON(),
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to authenticate user",
    })
  }
})

/**
 * GET /api/auth/me
 * Get current user profile (protected route)
 */
router.get("/me", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId)
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User account no longer exists",
      })
    }

    res.json({
      user: user.toJSON(),
    })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch user profile",
    })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh JWT token (protected route)
 */
router.post("/refresh", authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId)
    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User account no longer exists",
      })
    }

    // Generate new token
    const token = generateToken(user._id)

    res.json({
      message: "Token refreshed successfully",
      token,
    })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to refresh token",
    })
  }
})

/**
 * POST /api/auth/logout
 * Logout user (protected route)
 * Note: With JWT, logout is mainly handled on the client side by removing the token
 */
router.post("/logout", authenticateToken, async (req: Request, res: Response) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just return a success message
    res.json({
      message: "Logout successful",
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: "Failed to logout user",
    })
  }
})

export default router
