/**
 * Session Controller
 * Handles all session-related business logic
 */

import type { Request, Response } from "express"
import { validationResult } from "express-validator"
import Session from "../models/Session"
import Recording from "../models/Recording"
import { transcriptionService } from "../services/transcriptionService"
import { recordingProcessor } from "../services/recordingProcessor"
import { emailService } from "../services/emailService"

export class SessionController {
  /**
   * Get all sessions for the authenticated user
   */
  async getSessions(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, search } = req.query

      // Build query
      const query: any = {
        $or: [{ creator: req.user?.userId }, { "participants.userId": req.user?.userId }],
      }

      if (status && status !== "all") {
        query.status = status
      }

      if (search) {
        query.title = { $regex: search, $options: "i" }
      }

      // Execute query with pagination
      const sessions = await Session.find(query)
        .populate("creator", "name email avatar")
        .populate("participants.userId", "name email avatar")
        .populate("recordings")
        .sort({ createdAt: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))

      const total = await Session.countDocuments(query)

      res.json({
        sessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      console.error("Get sessions error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch sessions",
      })
    }
  }

  /**
   * Create a new recording session
   */
  async createSession(req: Request, res: Response) {
    try {
      // Check for validation errors
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { title, description, settings = {}, scheduledTime, inviteEmails = [] } = req.body

      // Create new session
      const session = new Session({
        title,
        description,
        creator: req.user?.userId,
        participants: [
          {
            userId: req.user?.userId,
            name: req.user?.name || "Host",
            role: "host",
          },
        ],
        settings: {
          maxParticipants: settings.maxParticipants || 10,
          recordVideo: settings.recordVideo ?? true,
          recordAudio: settings.recordAudio ?? true,
          allowChat: settings.allowChat ?? true,
          autoTranscribe: settings.autoTranscribe ?? false,
        },
        scheduledTime: scheduledTime ? new Date(scheduledTime) : undefined,
      })

      await session.save()

      // Send invitations if emails provided
      if (inviteEmails.length > 0) {
        await this.sendInvitations(session._id.toString(), inviteEmails, req.user?.name || "Host")
      }

      res.status(201).json({
        message: "Session created successfully",
        session: session.toJSON(),
      })
    } catch (error) {
      console.error("Create session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create session",
      })
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)
        .populate("creator", "name email avatar")
        .populate("participants.userId", "name email avatar")
        .populate("recordings")

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Check if user has access to this session
      const hasAccess =
        session.creator._id.toString() === req.user?.userId ||
        session.participants.some((p) => p.userId?.toString() === req.user?.userId)

      if (!hasAccess) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to access this session",
        })
      }

      res.json({
        session: session.toJSON(),
      })
    } catch (error) {
      console.error("Get session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch session",
      })
    }
  }

  /**
   * Update a session (only creator can update)
   */
  async updateSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Only creator can update session
      if (session.creator.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the session creator can update the session",
        })
      }

      // Don't allow updates to active sessions
      if (session.status === "active") {
        return res.status(400).json({
          error: "Cannot update active session",
          message: "Session cannot be updated while recording is in progress",
        })
      }

      // Update session
      const { title, description, settings, scheduledTime } = req.body

      if (title) session.title = title
      if (description !== undefined) session.description = description
      if (scheduledTime) session.scheduledTime = new Date(scheduledTime)
      if (settings) {
        session.settings = { ...session.settings, ...settings }
      }

      await session.save()

      res.json({
        message: "Session updated successfully",
        session: session.toJSON(),
      })
    } catch (error) {
      console.error("Update session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update session",
      })
    }
  }

  /**
   * Join a session as a participant
   */
  async joinSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Check if session is joinable
      if (session.status === "completed" || session.status === "cancelled") {
        return res.status(400).json({
          error: "Session not joinable",
          message: "This session has already ended",
        })
      }

      // Check if user is already a participant
      const existingParticipant = session.participants.find((p) => p.userId?.toString() === req.user?.userId)

      if (existingParticipant) {
        return res.json({
          message: "Already joined session",
          session: session.toJSON(),
        })
      }

      // Check participant limit
      if (session.participants.length >= session.settings.maxParticipants) {
        return res.status(400).json({
          error: "Session full",
          message: "This session has reached its maximum number of participants",
        })
      }

      // Add participant
      await session.addParticipant({
        userId: req.user?.userId,
        name: req.body.name || req.user?.name || "Participant",
        role: "participant",
      })

      res.json({
        message: "Joined session successfully",
        session: session.toJSON(),
      })
    } catch (error) {
      console.error("Join session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to join session",
      })
    }
  }

  /**
   * Leave a session
   */
  async leaveSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Find participant
      const participant = session.participants.find((p) => p.userId?.toString() === req.user?.userId)

      if (!participant) {
        return res.status(400).json({
          error: "Not a participant",
          message: "You are not a participant in this session",
        })
      }

      // Update leave time
      participant.leftAt = new Date()
      await session.save()

      res.json({
        message: "Left session successfully",
      })
    } catch (error) {
      console.error("Leave session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to leave session",
      })
    }
  }

  /**
   * Start recording a session
   */
  async startSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Only creator can start recording
      if (session.creator.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the session creator can start recording",
        })
      }

      // Check if session is already active
      if (session.status === "active") {
        return res.status(400).json({
          error: "Session already active",
          message: "Recording is already in progress",
        })
      }

      // Start session
      session.status = "active"
      session.startTime = new Date()
      await session.save()

      res.json({
        message: "Recording started successfully",
        session: session.toJSON(),
      })
    } catch (error) {
      console.error("Start session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to start recording",
      })
    }
  }

  /**
   * Stop recording a session
   */
  async stopSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Only creator can stop recording
      if (session.creator.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the session creator can stop recording",
        })
      }

      // Check if session is active
      if (session.status !== "active") {
        return res.status(400).json({
          error: "Session not active",
          message: "No recording is currently in progress",
        })
      }

      // Stop session
      session.status = "completed"
      session.endTime = new Date()
      await session.save()

      // Start background processing
      this.processSessionRecordings(session._id.toString())

      res.json({
        message: "Recording stopped successfully",
        session: session.toJSON(),
      })
    } catch (error) {
      console.error("Stop session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to stop recording",
      })
    }
  }

  /**
   * Get all recordings for a session
   */
  async getSessionRecordings(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Check access
      const hasAccess =
        session.creator.toString() === req.user?.userId ||
        session.participants.some((p) => p.userId?.toString() === req.user?.userId)

      if (!hasAccess) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to access this session",
        })
      }

      const recordings = await Recording.find({ sessionId: req.params.id })
        .populate("userId", "name email avatar")
        .sort({ createdAt: -1 })

      res.json({
        recordings,
      })
    } catch (error) {
      console.error("Get session recordings error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch recordings",
      })
    }
  }

  /**
   * Delete a session (only creator can delete)
   */
  async deleteSession(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const session = await Session.findById(req.params.id)

      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "The requested session does not exist",
        })
      }

      // Only creator can delete session
      if (session.creator.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the session creator can delete the session",
        })
      }

      // Don't allow deletion of active sessions
      if (session.status === "active") {
        return res.status(400).json({
          error: "Cannot delete active session",
          message: "Session cannot be deleted while recording is in progress",
        })
      }

      // Delete associated recordings from cloud storage
      const recordings = await Recording.find({ sessionId: req.params.id })
      for (const recording of recordings) {
        try {
          // Delete from Cloudinary
          const cloudinary = require("cloudinary").v2
          await cloudinary.uploader.destroy(recording.cloudinaryPublicId, {
            resource_type: "video",
          })
          if (recording.thumbnailUrl) {
            const thumbnailPublicId = recording.cloudinaryPublicId.replace(/\.[^/.]+$/, "") + "_thumb"
            await cloudinary.uploader.destroy(thumbnailPublicId)
          }
        } catch (error) {
          console.error("Failed to delete recording from cloud:", error)
        }
      }

      // Delete recordings from database
      await Recording.deleteMany({ sessionId: req.params.id })

      // Delete session
      await Session.findByIdAndDelete(req.params.id)

      res.json({
        message: "Session deleted successfully",
      })
    } catch (error) {
      console.error("Delete session error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete session",
      })
    }
  }

  /**
   * Send invitations to participants
   */
  async sendInvitations(sessionId: string, emails: string[], hostName: string) {
    try {
      const session = await Session.findById(sessionId).populate("creator", "name email")
      if (!session) return

      const inviteLink = `${process.env.FRONTEND_URL}/studio?session=${sessionId}`

      for (const email of emails) {
        try {
          await emailService.sendInvitation({
            to: email,
            sessionTitle: session.title,
            hostName,
            inviteLink,
            scheduledTime: session.scheduledTime,
          })

          // Add as participant with email
          await session.addParticipant({
            email,
            name: email.split("@")[0], // Use email prefix as name
            role: "participant",
          })
        } catch (error) {
          console.error(`Failed to send invitation to ${email}:`, error)
        }
      }
    } catch (error) {
      console.error("Send invitations error:", error)
    }
  }

  /**
   * Process session recordings after session ends
   */
  private async processSessionRecordings(sessionId: string) {
    try {
      console.log(`🎬 Processing recordings for session: ${sessionId}`)

      const session = await Session.findById(sessionId)
      if (!session) return

      // Get all completed recordings for the session
      const recordings = await Recording.find({
        sessionId,
        status: "completed",
      }).sort({ createdAt: 1 })

      if (recordings.length === 0) {
        console.log("No recordings found for session")
        return
      }

      // Mix recordings if multiple participants
      if (recordings.length > 1) {
        try {
          const mixedUrl = await recordingProcessor.mixSessionRecordings({
            sessionId,
            outputFormat: "mp4",
            quality: "high",
          })

          // Create a new recording entry for the mixed version
          const mixedRecording = new Recording({
            sessionId,
            userId: session.creator,
            fileName: `mixed-session-${sessionId}.mp4`,
            originalName: `Mixed Recording - ${session.title}`,
            fileSize: 0, // Will be updated after processing
            duration: session.duration || 0,
            mimeType: "video/mp4",
            quality: "high",
            type: "video",
            cloudinaryUrl: mixedUrl,
            cloudinaryPublicId: `mixed-${sessionId}`,
            status: "completed",
            metadata: {
              resolution: "1920x1080",
              codec: "h264",
            },
          })

          await mixedRecording.save()
          session.recordings.push(mixedRecording._id)
          await session.save()

          console.log(`✅ Mixed recording created: ${mixedUrl}`)
        } catch (error) {
          console.error("Failed to mix recordings:", error)
        }
      }

      // Start transcription if enabled
      if (session.settings.autoTranscribe) {
        try {
          const recordingIds = recordings.map((r) => r._id.toString())
          await transcriptionService.batchTranscribe(recordingIds, {
            language: "en-US",
            enableSpeakerDiarization: true,
            maxSpeakers: session.participants.length,
          })

          console.log(`✅ Transcription started for ${recordingIds.length} recordings`)
        } catch (error) {
          console.error("Failed to start transcription:", error)
        }
      }

      // Send completion notification
      try {
        await emailService.sendRecordingComplete({
          to: session.creator.email,
          sessionTitle: session.title,
          recordingCount: recordings.length,
          duration: session.duration || 0,
          dashboardLink: `${process.env.FRONTEND_URL}/dashboard`,
        })
      } catch (error) {
        console.error("Failed to send completion notification:", error)
      }
    } catch (error) {
      console.error("Process session recordings error:", error)
    }
  }

  /**
   * Get session analytics
   */
  async getSessionAnalytics(req: Request, res: Response) {
    try {
      const { timeframe = "30d" } = req.query
      const userId = req.user?.userId

      // Calculate date range
      const now = new Date()
      const startDate = new Date()

      switch (timeframe) {
        case "7d":
          startDate.setDate(now.getDate() - 7)
          break
        case "30d":
          startDate.setDate(now.getDate() - 30)
          break
        case "90d":
          startDate.setDate(now.getDate() - 90)
          break
        default:
          startDate.setDate(now.getDate() - 30)
      }

      // Get session statistics
      const totalSessions = await Session.countDocuments({
        creator: userId,
        createdAt: { $gte: startDate },
      })

      const completedSessions = await Session.countDocuments({
        creator: userId,
        status: "completed",
        createdAt: { $gte: startDate },
      })

      const totalRecordings = await Recording.countDocuments({
        userId,
        createdAt: { $gte: startDate },
      })

      const totalDuration = await Session.aggregate([
        {
          $match: {
            creator: userId,
            status: "completed",
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: "$duration" },
          },
        },
      ])

      // Get daily session counts
      const dailyStats = await Session.aggregate([
        {
          $match: {
            creator: userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])

      res.json({
        analytics: {
          totalSessions,
          completedSessions,
          totalRecordings,
          totalDuration: totalDuration[0]?.totalDuration || 0,
          completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
          dailyStats,
        },
      })
    } catch (error) {
      console.error("Get session analytics error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch analytics",
      })
    }
  }
}

export const sessionController = new SessionController()
