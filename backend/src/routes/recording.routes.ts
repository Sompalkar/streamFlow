/**
 * Recording Routes
 * Clean route definitions for recording management endpoints
 */

import { Router } from "express"
import { RecordingController } from "@/controllers/recording.controller"
import { validate } from "@/middleware/validation.middleware"
import { authenticateToken } from "@/middleware/auth.middleware"
import { asyncHandler } from "@/middleware/error.middleware"
import {
  updateRecordingSchema,
  recordingIdSchema,
  recordingQuerySchema,
  transcriptionRequestSchema,
  shareRecordingSchema,
} from "@/validators/recording.validator"

const router = Router()
const recordingController = new RecordingController()

/**
 * @route   GET /api/recordings
 * @desc    Get all recordings for the authenticated user
 * @access  Private
 */
router.get(
  "/",
  authenticateToken,
  validate(recordingQuerySchema),
  asyncHandler(recordingController.getRecordings.bind(recordingController)),
)

/**
 * @route   GET /api/recordings/:id
 * @desc    Get a specific recording by ID
 * @access  Private
 */
router.get(
  "/:id",
  authenticateToken,
  validate(recordingIdSchema),
  asyncHandler(recordingController.getRecording.bind(recordingController)),
)

/**
 * @route   PUT /api/recordings/:id
 * @desc    Update recording metadata
 * @access  Private
 */
router.put(
  "/:id",
  authenticateToken,
  validate(updateRecordingSchema),
  asyncHandler(recordingController.updateRecording.bind(recordingController)),
)

/**
 * @route   DELETE /api/recordings/:id
 * @desc    Delete a recording
 * @access  Private
 */
router.delete(
  "/:id",
  authenticateToken,
  validate(recordingIdSchema),
  asyncHandler(recordingController.deleteRecording.bind(recordingController)),
)

/**
 * @route   POST /api/recordings/:id/transcribe
 * @desc    Request transcription for a recording
 * @access  Private
 */
router.post(
  "/:id/transcribe",
  authenticateToken,
  validate(transcriptionRequestSchema),
  asyncHandler(recordingController.transcribeRecording.bind(recordingController)),
)

/**
 * @route   POST /api/recordings/:id/share
 * @desc    Generate a shareable link for a recording
 * @access  Private
 */
router.post(
  "/:id/share",
  authenticateToken,
  validate(shareRecordingSchema),
  asyncHandler(recordingController.shareRecording.bind(recordingController)),
)

/**
 * @route   GET /api/recordings/:id/download
 * @desc    Download a recording file
 * @access  Private
 */
router.get(
  "/:id/download",
  authenticateToken,
  validate(recordingIdSchema),
  asyncHandler(recordingController.downloadRecording.bind(recordingController)),
)

export default router
