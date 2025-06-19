/**
 * Recording Routes
 * RESTful API endpoints for recording management
 */

import { Router } from "express"
import { body, param, query } from "express-validator"
import { recordingController } from "../controllers/recordingController"

const router = Router()

// Validation middleware
const validateRecordingId = param("id").isMongoId().withMessage("Invalid recording ID")

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["all", "uploading", "processing", "completed", "failed"])
    .withMessage("Invalid status"),
  query("type").optional().isIn(["all", "video", "audio", "screen"]).withMessage("Invalid type"),
  query("sessionId").optional().isMongoId().withMessage("Invalid session ID"),
]

const validateUpdateRecording = [
  validateRecordingId,
  body("fileName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("File name must be between 1 and 255 characters"),
  body("originalName")
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage("Original name must be between 1 and 255 characters"),
]

const validateTranscriptionRequest = [
  validateRecordingId,
  body("language")
    .optional()
    .isString()
    .isLength({ min: 2, max: 10 })
    .withMessage("Language must be a valid language code"),
  body("enableSpeakerDiarization").optional().isBoolean().withMessage("Speaker diarization must be a boolean"),
]

const validateShareRecording = [
  validateRecordingId,
  body("expiresIn").optional().isIn(["1h", "24h", "7d", "30d", "never"]).withMessage("Invalid expiration time"),
  body("allowDownload").optional().isBoolean().withMessage("Allow download must be a boolean"),
]

/**
 * @route   GET /api/recordings
 * @desc    Get all recordings for the authenticated user
 * @access  Private
 */
router.get("/", validatePagination, recordingController.getRecordings)

/**
 * @route   GET /api/recordings/analytics
 * @desc    Get recording analytics
 * @access  Private
 */
router.get(
  "/analytics",
  [query("timeframe").optional().isIn(["7d", "30d", "90d"]).withMessage("Invalid timeframe")],
  recordingController.getRecordingAnalytics,
)

/**
 * @route   GET /api/recordings/:id
 * @desc    Get a specific recording by ID
 * @access  Private
 */
router.get("/:id", validateRecordingId, recordingController.getRecording)

/**
 * @route   PUT /api/recordings/:id
 * @desc    Update recording metadata
 * @access  Private
 */
router.put("/:id", validateUpdateRecording, recordingController.updateRecording)

/**
 * @route   DELETE /api/recordings/:id
 * @desc    Delete a recording
 * @access  Private
 */
router.delete("/:id", validateRecordingId, recordingController.deleteRecording)

/**
 * @route   GET /api/recordings/:id/download
 * @desc    Get download link for a recording
 * @access  Private
 */
router.get("/:id/download", validateRecordingId, recordingController.downloadRecording)

/**
 * @route   GET /api/recordings/:id/transcription
 * @desc    Get transcription for a recording
 * @access  Private
 */
router.get("/:id/transcription", validateRecordingId, recordingController.getTranscription)

/**
 * @route   POST /api/recordings/:id/transcription
 * @desc    Request transcription for a recording
 * @access  Private
 */
router.post("/:id/transcription", validateTranscriptionRequest, recordingController.requestTranscription)

/**
 * @route   POST /api/recordings/:id/share
 * @desc    Share a recording
 * @access  Private
 */
router.post("/:id/share", validateShareRecording, recordingController.shareRecording)

export default router
