/**
 * Recording Validators
 * Zod schemas for recording-related data validation
 */

import { z } from "zod"

/**
 * Recording update validation schema
 */
export const updateRecordingSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid recording ID"),
  }),
  body: z.object({
    fileName: z
      .string()
      .min(1, "File name is required")
      .max(255, "File name cannot exceed 255 characters")
      .trim()
      .optional(),
    originalName: z
      .string()
      .min(1, "Original name is required")
      .max(255, "Original name cannot exceed 255 characters")
      .trim()
      .optional(),
  }),
})

/**
 * Recording ID parameter validation
 */
export const recordingIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid recording ID"),
  }),
})

/**
 * Recording query parameters validation
 */
export const recordingQuerySchema = z.object({
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
    status: z.enum(["all", "uploading", "processing", "completed", "failed"]).optional(),
    type: z.enum(["all", "video", "audio", "screen"]).optional(),
    sessionId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID")
      .optional(),
  }),
})

/**
 * Transcription request validation schema
 */
export const transcriptionRequestSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid recording ID"),
  }),
  body: z.object({
    language: z
      .string()
      .min(2, "Language code must be at least 2 characters")
      .max(10, "Language code cannot exceed 10 characters")
      .optional(),
    enableSpeakerDiarization: z.boolean().optional(),
  }),
})

/**
 * Share recording validation schema
 */
export const shareRecordingSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid recording ID"),
  }),
  body: z.object({
    expiresIn: z.enum(["1h", "24h", "7d", "30d", "never"]).optional(),
    allowDownload: z.boolean().optional(),
  }),
})

/**
 * File upload validation schema
 */
export const uploadRecordingSchema = z.object({
  body: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
    participantId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid participant ID")
      .optional(),
    enableTranscription: z
      .string()
      .transform((val) => val === "true")
      .optional(),
  }),
})

// Export type inference for TypeScript
export type UpdateRecordingInput = z.infer<typeof updateRecordingSchema>
export type RecordingIdInput = z.infer<typeof recordingIdSchema>
export type RecordingQueryInput = z.infer<typeof recordingQuerySchema>
export type TranscriptionRequestInput = z.infer<typeof transcriptionRequestSchema>
export type ShareRecordingInput = z.infer<typeof shareRecordingSchema>
export type UploadRecordingInput = z.infer<typeof uploadRecordingSchema>
