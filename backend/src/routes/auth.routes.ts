/**
 * Authentication Routes
 * Clean route definitions for authentication endpoints
 */

import { Router } from "express"
import rateLimit from "express-rate-limit"
import { AuthController } from "../controllers/auth.controller"
import { validate } from "../middleware/validation.middleware"
import { authenticate } from "../middleware/auth.middleware"
import { asyncHandler } from "../middleware/error.middleware"
import { registerSchema, loginSchema, changePasswordSchema, updateProfileSchema } from "@/validators/auth.validator"

const router = Router()
const authController = new AuthController()

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

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register.bind(authController)),
)

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 */
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login.bind(authController)))

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/me", authenticate, asyncHandler(authController.getProfile.bind(authController)))

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(authController.updateProfile.bind(authController)),
)

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword.bind(authController)),
)

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post("/refresh", authenticate, asyncHandler(authController.refreshToken.bind(authController)))

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post("/logout", authenticate, asyncHandler(authController.logout.bind(authController)))

export default router
