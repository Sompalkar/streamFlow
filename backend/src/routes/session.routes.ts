/**
 * Session Routes
 * Clean route definitions for session management endpoints
 */

import { Router } from "express"
import { SessionController } from "@/controllers/session.controller"
import { validate } from "@/middleware/validation.middleware"
import { authenticateToken } from "@/middleware/auth.middleware"
import { asyncHandler } from "@/middleware/error.middleware"
import {
  createSessionSchema,
  updateSessionSchema,
  joinSessionSchema,
  sessionIdSchema,
  sessionQuerySchema,
  analyticsQuerySchema,
} from "@/validators/session.validator"

const router = Router()
const sessionController = new SessionController()

/**
 * @route   GET /api/sessions
 * @desc    Get all sessions for the authenticated user
 * @access  Private
 */
router.get(
  "/",
  authenticateToken,
  validate(sessionQuerySchema),
  asyncHandler(sessionController.getSessions.bind(sessionController)),
)

/**
 * @route   POST /api/sessions
 * @desc    Create a new recording session
 * @access  Private
 */
router.post(
  "/",
  authenticateToken,
  validate(createSessionSchema),
  asyncHandler(sessionController.createSession.bind(sessionController)),
)

/**
 * @route   GET /api/sessions/analytics
 * @desc    Get session analytics
 * @access  Private
 */
router.get(
  "/analytics",
  authenticateToken,
  validate(analyticsQuerySchema),
  asyncHandler(sessionController.getAnalytics.bind(sessionController)),
)

/**
 * @route   GET /api/sessions/:id
 * @desc    Get a specific session by ID
 * @access  Private
 */
router.get(
  "/:id",
  authenticateToken,
  validate(sessionIdSchema),
  asyncHandler(sessionController.getSession.bind(sessionController)),
)

/**
 * @route   PUT /api/sessions/:id
 * @desc    Update a session (only creator can update)
 * @access  Private
 */
router.put(
  "/:id",
  authenticateToken,
  validate(updateSessionSchema),
  asyncHandler(sessionController.updateSession.bind(sessionController)),
)

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete a session (only creator can delete)
 * @access  Private
 */
router.delete(
  "/:id",
  authenticateToken,
  validate(sessionIdSchema),
  asyncHandler(sessionController.deleteSession.bind(sessionController)),
)

/**
 * @route   POST /api/sessions/:id/join
 * @desc    Join a session as a participant
 * @access  Private
 */
router.post(
  "/:id/join",
  authenticateToken,
  validate(joinSessionSchema),
  asyncHandler(sessionController.joinSession.bind(sessionController)),
)

/**
 * @route   POST /api/sessions/:id/leave
 * @desc    Leave a session
 * @access  Private
 */
router.post(
  "/:id/leave",
  authenticateToken,
  validate(sessionIdSchema),
  asyncHandler(sessionController.leaveSession.bind(sessionController)),
)

/**
 * @route   POST /api/sessions/:id/start
 * @desc    Start recording a session
 * @access  Private
 */
router.post(
  "/:id/start",
  authenticateToken,
  validate(sessionIdSchema),
  asyncHandler(sessionController.startSession.bind(sessionController)),
)

/**
 * @route   POST /api/sessions/:id/stop
 * @desc    Stop recording a session
 * @access  Private
 */
router.post(
  "/:id/stop",
  authenticateToken,
  validate(sessionIdSchema),
  asyncHandler(sessionController.stopSession.bind(sessionController)),
)

/**
 * @route   GET /api/sessions/:id/recordings
 * @desc    Get all recordings for a session
 * @access  Private
 */
router.get(
  "/:id/recordings",
  authenticateToken,
  validate(sessionIdSchema),
  asyncHandler(sessionController.getSessionRecordings.bind(sessionController)),
)

export default router
