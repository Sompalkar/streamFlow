/**
 * Authentication Validators
 * Zod schemas for authentication-related data validation
 */

import { z } from "zod"

/**
 * User registration validation schema
 */
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters").trim(),
    email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number",
      ),
  }),
})

/**
 * User login validation schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Please provide a valid email address").toLowerCase().trim(),
    password: z.string().min(1, "Password is required"),
  }),
})

/**
 * Password change validation schema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "New password must contain at least one lowercase letter, one uppercase letter, and one number",
      ),
  }),
})

/**
 * Profile update validation schema
 */
export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name cannot exceed 50 characters")
      .trim()
      .optional(),
    email: z.string().email("Please provide a valid email address").toLowerCase().trim().optional(),
    avatar: z.string().url("Avatar must be a valid URL").optional(),
  }),
})

// Export type inference for TypeScript
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
