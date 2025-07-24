/**
 * Session Validators
 * Zod schemas for session-related data validation
 */

import { z } from "zod"

/**
 * Session creation validation schema
 */
export const createSessionSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters").trim(),
    description: z.string().max(500, "Description cannot exceed 500 characters").trim().optional(),
    settings: z
      .object({
        maxParticipants: z
          .number()
          .int()
          .min(2, "Maximum participants must be at least 2")
          .max(50, "Maximum participants cannot exceed 50")
          .optional(),
        recordVideo: z.boolean().optional(),
        recordAudio: z.boolean().optional(),
        allowChat: z.boolean().optional(),
        autoTranscribe: z.boolean().optional(),
      })
      .optional(),
    scheduledTime: z.string().datetime("Invalid scheduled time format").optional(),
    inviteEmails: z.array(z.string().email("Invalid email address")).optional(),
  }),
})

/**
 * Session update validation schema
 */
export const updateSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
  }),
  body: z.object({
    title: z.string().min(1, "Title is required").max(100, "Title cannot exceed 100 characters").trim().optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").trim().optional(),
    settings: z
      .object({
        maxParticipants: z
          .number()
          .int()
          .min(2, "Maximum participants must be at least 2")
          .max(50, "Maximum participants cannot exceed 50")
          .optional(),
        recordVideo: z.boolean().optional(),
        recordAudio: z.boolean().optional(),
        allowChat: z.boolean().optional(),
        autoTranscribe: z.boolean().optional(),
      })
      .optional(),
    scheduledTime: z.string().datetime("Invalid scheduled time format").optional(),
  }),
})

/**
 * Join session validation schema
 */
export const joinSessionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters").trim().optional(),
  }),
})

/**
 * Session ID parameter validation
 */
export const sessionIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
  }),
})

/**
 * Session query parameters validation
 */
export const sessionQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .regex(/^\d+$/, "Page must be a positive integer")
      .transform(Number)
      .refine((val) => val >= 1, "Page must be at least 1")
      .optional(),
    limit: z
      .string()
      .regex(/^\d+$/, "Limit must be a positive integer")
      .transform(Number)
      .refine((val) => val >= 1 && val <= 100, "Limit must be between 1 and 100")
      .optional(),
    status: z.enum(["all", "scheduled", "active", "completed", "cancelled"]).optional(),
    search: z.string().max(100, "Search query too long").trim().optional(),
  }),
})

/**
 * Analytics query validation
 */
export const analyticsQuerySchema = z.object({
  query: z.object({
    timeframe: z.enum(["7d", "30d", "90d"]).optional(),
  }),
})

// Export type inference for TypeScript
export type CreateSessionInput = z.infer<typeof createSessionSchema>
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>
export type JoinSessionInput = z.infer<typeof joinSessionSchema>
export type SessionIdInput = z.infer<typeof sessionIdSchema>
export type SessionQueryInput = z.infer<typeof sessionQuerySchema>
export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>
