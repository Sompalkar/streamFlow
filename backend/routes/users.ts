/**
 * User Routes
 * Handles user profile and account management endpoints
 */

import express from "express"
import { body } from "express-validator"
import { userController } from "../controllers/userController"

const router = express.Router()

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get("/profile", userController.getProfile)

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  "/profile",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email address"),
    body("avatar").optional().isURL().withMessage("Avatar must be a valid URL"),
  ],
  userController.updateProfile,
)

/**
 * POST /api/users/change-password
 * Change user password
 */
router.post(
  "/change-password",
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("New password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage("New password must contain at least one lowercase letter, one uppercase letter, and one number"),
  ],
  userController.changePassword,
)

/**
 * GET /api/users/dashboard-stats
 * Get dashboard statistics for current user
 */
router.get("/dashboard-stats", userController.getDashboardStats)

/**
 * GET /api/users/preferences
 * Get user preferences
 */
router.get("/preferences", userController.getPreferences)

/**
 * PUT /api/users/preferences
 * Update user preferences
 */
router.put(
  "/preferences",
  [body("preferences").isObject().withMessage("Preferences must be an object")],
  userController.updatePreferences,
)

/**
 * DELETE /api/users/account
 * Delete user account
 */
router.delete(
  "/account",
  [body("password").notEmpty().withMessage("Password is required to delete account")],
  userController.deleteAccount,
)

export default router
