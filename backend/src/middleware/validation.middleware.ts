/**
 * Validation Middleware
 * Handles request validation using Zod schemas
 */

import type { Request, Response, NextFunction } from "express"
import { type ZodSchema, ZodError } from "zod"

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        })
      }
      next(error)
    }
  }
}

/**
 * Validate request body
 */
// export function validateBody<T>(schema: ZodSchema<T>) {
//   return (req: Request, res: Response, next: NextFunction): void => {
//     try {
//       const validatedData = schema.parse(req.body)
//       req.body = validatedData
//       next()
//     } catch (error) {
//       if (error instanceof ZodError) {
//         res.status(400).json({
//           success: false,
//           message: "Validation error",
//           errors: error.errors.map((err) => ({
//             field: err.path.join("."),
//             message: err.message,
//           })),
//         })
//         return
//       }

//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//       })
//     }
//   }
// }

/**
 * Validate request query parameters
 */
// export function validateQuery<T>(schema: ZodSchema<T>) {
//   return (req: Request, res: Response, next: NextFunction): void => {
//     try {
//       const validatedData = schema.parse(req.query)
//       req.query = validatedData as any
//       next()
//     } catch (error) {
//       if (error instanceof ZodError) {
//         res.status(400).json({
//           success: false,
//           message: "Query validation error",
//           errors: error.errors.map((err) => ({
//             field: err.path.join("."),
//             message: err.message,
//           })),
//         })
//         return
//       }

//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//       })
//     }
//   }
// }

/**
 * Validate request parameters
 */
// export function validateParams<T>(schema: ZodSchema<T>) {
//   return (req: Request, res: Response, next: NextFunction): void => {
//     try {
//       const validatedData = schema.parse(req.params)
//       req.params = validatedData as any
//       next()
//     } catch (error) {
//       if (error instanceof ZodError) {
//         res.status(400).json({
//           success: false,
//           message: "Parameter validation error",
//           errors: error.errors.map((err) => ({
//             field: err.path.join("."),
//             message: err.message,
//           })),
//         })
//         return
//       }

//       res.status(500).json({
//         success: false,
//         message: "Internal server error",
//       })
//     }
//   }
// }

/**
 * Validate file upload
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "File is required",
    })
  }
  next()
}
// export function validateFileUpload(req: Request, res: Response, next: NextFunction): void {
//   const file = req.file

//   if (!file) {
//     res.status(400).json({
//       success: false,
//       message: "No file uploaded",
//     })
//     return
//   }

//   // Check file size (50MB limit)
//   const maxSize = 50 * 1024 * 1024 // 50MB in bytes
//   if (file.size > maxSize) {
//     res.status(400).json({
//       success: false,
//       message: "File size exceeds 50MB limit",
//     })
//     return
//   }

//   // Check file type for recordings
//   const allowedMimeTypes = [
//     "video/mp4",
//     "video/webm",
//     "video/avi",
//     "video/mov",
//     "audio/mpeg",
//     "audio/wav",
//     "audio/mp3",
//     "audio/m4a",
//     "audio/ogg",
//   ]

//   if (!allowedMimeTypes.includes(file.mimetype)) {
//     res.status(400).json({
//       success: false,
//       message: "Unsupported file type",
//       supportedTypes: allowedMimeTypes,
//     })
//     return
//   }

//   next()
// }

/**
 * Validate avatar upload
 */
export function validateAvatarUpload(req: Request, res: Response, next: NextFunction): void {
  const file = req.file

  if (!file) {
    res.status(400).json({
      success: false,
      message: "No file uploaded",
    })
    return
  }

  // Check file size (5MB limit for avatars)
  const maxSize = 5 * 1024 * 1024 // 5MB in bytes
  if (file.size > maxSize) {
    res.status(400).json({
      success: false,
      message: "File size exceeds 5MB limit",
    })
    return
  }

  // Check file type for images
  const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]

  if (!allowedMimeTypes.includes(file.mimetype)) {
    res.status(400).json({
      success: false,
      message: "Unsupported image type",
      supportedTypes: allowedMimeTypes,
    })
    return
  }

  next()
}
