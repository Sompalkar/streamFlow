/**
 * Upload Routes
 * Clean route definitions for file upload endpoints
 */

import { Router } from "express"
import rateLimit from "express-rate-limit"
import { UploadController } from "@/controllers/upload.controller"
import { validate, validateFileUpload } from "@/middleware/validation.middleware"
import { authenticateToken } from "@/middleware/auth.middleware"
import { asyncHandler } from "@/middleware/error.middleware"
import { uploadRecordingSchema } from "@/validators/recording.validator"
import { setupMulter } from "@/config/multer"

const router = Router()
const uploadController = new UploadController()
const upload = setupMulter()

// Rate limiting for uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    error: "Upload limit exceeded",
    message: "Please wait before uploading more files",
  },
})

/**
 * @route   POST /api/upload/recording
 * @desc    Upload a recording file
 * @access  Private
 */
router.post(
  "/recording",
  uploadLimiter,
  authenticateToken,
  upload.single("recording"),
  validateFileUpload,
  validate(uploadRecordingSchema),
  asyncHandler(uploadController.uploadRecording.bind(uploadController)),
)

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
  "/avatar",
  authenticateToken,
  upload.single("avatar"),
  asyncHandler(uploadController.uploadAvatar.bind(uploadController)),
)

export default router
