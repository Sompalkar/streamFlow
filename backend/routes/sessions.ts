/**
 * Session Routes
 * RESTful API endpoints for session management
 */

import { Router } from "express"
import { body, param, query } from "express-validator"
import { sessionController } from "../controllers/sessionController"

const router = Router()

// Validation middleware
const validateSessionId = param("id").isMongoId().withMessage("Invalid session ID")

const validateCreateSession = [
  body("title").trim().isLength({ min: 1, max: 100 }).withMessage("Title must be between 1 and 100 characters"),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
  body("settings.maxParticipants")
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage("Max participants must be between 2 and 50"),
  body("settings.recordVideo").optional().isBoolean().withMessage("Record video must be a boolean"),
  body("settings.recordAudio").optional().isBoolean().withMessage("Record audio must be a boolean"),
  body("settings.allowChat").optional().isBoolean().withMessage("Allow chat must be a boolean"),
  body("settings.autoTranscribe").optional().isBoolean().withMessage("Auto transcribe must be a boolean"),
  body("scheduledTime").optional().isISO8601().withMessage("Scheduled time must be a valid ISO date"),
  body("inviteEmails").optional().isArray().withMessage("Invite emails must be an array"),
  body("inviteEmails.*").optional().isEmail().withMessage("Each invite email must be valid"),
]

const validateUpdateSession = [
  validateSessionId,
  body("title")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Title must be between 1 and 100 characters"),
  body("description").optional().trim().isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
  body("settings.maxParticipants")
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage("Max participants must be between 2 and 50"),
]

const validateJoinSession = [
  validateSessionId,
  body("name").optional().trim().isLength({ min: 1, max: 50 }).withMessage("Name must be between 1 and 50 characters"),
]

const validatePagination = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
  query("status").optional().isIn(["all", "waiting", "active", "completed", "cancelled"]).withMessage("Invalid status"),
  query("search").optional().trim().isLength({ max: 100 }).withMessage("Search query too long"),
]

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions for the authenticated user
 * @access  Private
 */
router.get("/", validatePagination, sessionController.getSessions)

/**
 * @route   POST /api/sessions
 * @desc    Create a new recording session
 * @access  Private
 */
router.post("/", validateCreateSession, sessionController.createSession)

/**
 * @route   GET /api/sessions/analytics
 * @desc    Get session analytics
 * @access  Private
 */
router.get(
  "/analytics",
  [query("timeframe").optional().isIn(["7d", "30d", "90d"]).withMessage("Invalid timeframe")],
  sessionController.getSessionAnalytics,
)

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a specific session by ID
 * @access  Private
 */
router.get("/:id", validateSessionId, sessionController.getSession)

/**
 * @route   PUT /api/sessions/:id
 * @desc    Update a session (only creator can update)
 * @access  Private
 */
router.put("/:id", validateUpdateSession, sessionController.updateSession)

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete a session (only creator can delete)
 * @access  Private
 */
router.delete("/:id", validateSessionId, sessionController.deleteSession)

/**
 * @route   POST /api/sessions/:id/join
 * @desc    Join a session as a participant
 * @access  Private
 */
router.post("/:id/join", validateJoinSession, sessionController.joinSession)

/**
 * @route   POST /api/sessions/:id/leave
 * @desc    Leave a session
 * @access  Private
 */
router.post("/:id/leave", validateSessionId, sessionController.leaveSession)

/**
 * @route   POST /api/sessions/:id/start
 * @desc    Start recording a session
 * @access  Private
 */
router.post("/:id/start", validateSessionId, sessionController.startSession)

/**
 * @route   POST /api/sessions/:id/stop
 * @desc    Stop recording a session
 * @access  Private
 */
router.post("/:id/stop", validateSessionId, sessionController.stopSession)

/**
 * @route   GET /api/sessions/:id/recordings
 * @desc    Get all recordings for a session
 * @access  Private
 */
router.get("/:id/recordings", validateSessionId, sessionController.getSessionRecordings)

export default router
