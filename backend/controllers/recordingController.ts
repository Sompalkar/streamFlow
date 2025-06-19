/**
 * Recording Controller
 * Handles all recording-related business logic
 */

import type { Request, Response } from "express"
import { validationResult } from "express-validator"
import Recording from "../models/Recording"
import Session from "../models/Session"
import { transcriptionService } from "../services/transcriptionService"
import { v2 as cloudinary } from "cloudinary"

export class RecordingController {
  /**
   * Get all recordings for the authenticated user
   */
  async getRecordings(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, status, type, sessionId } = req.query

      // Build query
      const query: any = { userId: req.user?.userId }

      if (status && status !== "all") {
        query.status = status
      }

      if (type && type !== "all") {
        query.type = type
      }

      if (sessionId) {
        query.sessionId = sessionId
      }

      // Execute query with pagination
      const recordings = await Recording.find(query)
        .populate("sessionId", "title description creator")
        .populate("userId", "name email avatar")
        .sort({ createdAt: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))

      const total = await Recording.countDocuments(query)

      res.json({
        recordings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      console.error("Get recordings error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch recordings",
      })
    }
  }

  /**
   * Get a specific recording by ID
   */
  async getRecording(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const recording = await Recording.findById(req.params.id)
        .populate("sessionId", "title description creator participants")
        .populate("userId", "name email avatar")

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Check if user has access to this recording
      const session = recording.sessionId as any
      const hasAccess =
        recording.userId.toString() === req.user?.userId ||
        session.creator.toString() === req.user?.userId ||
        session.participants.some((p: any) => p.userId?.toString() === req.user?.userId)

      if (!hasAccess) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to access this recording",
        })
      }

      res.json({
        recording: recording.toJSON(),
      })
    } catch (error) {
      console.error("Get recording error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch recording",
      })
    }
  }

  /**
   * Update recording metadata
   */
  async updateRecording(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const recording = await Recording.findById(req.params.id)

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Only recording owner can update
      if (recording.userId.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the recording owner can update the recording",
        })
      }

      // Update allowed fields
      const { fileName, originalName } = req.body

      if (fileName) recording.fileName = fileName
      if (originalName) recording.originalName = originalName

      await recording.save()

      res.json({
        message: "Recording updated successfully",
        recording: recording.toJSON(),
      })
    } catch (error) {
      console.error("Update recording error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update recording",
      })
    }
  }

  /**
   * Delete a recording
   */
  async deleteRecording(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const recording = await Recording.findById(req.params.id)

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Only recording owner can delete
      if (recording.userId.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the recording owner can delete the recording",
        })
      }

      try {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(recording.cloudinaryPublicId, {
          resource_type: "video",
        })

        // Delete thumbnail if exists
        if (recording.thumbnailUrl) {
          const thumbnailPublicId = recording.cloudinaryPublicId.replace(/\.[^/.]+$/, "") + "_thumb"
          await cloudinary.uploader.destroy(thumbnailPublicId)
        }
      } catch (error) {
        console.error("Failed to delete from cloud storage:", error)
      }

      // Remove from session recordings array
      await Session.updateOne({ _id: recording.sessionId }, { $pull: { recordings: recording._id } })

      // Delete recording from database
      await Recording.findByIdAndDelete(req.params.id)

      res.json({
        message: "Recording deleted successfully",
      })
    } catch (error) {
      console.error("Delete recording error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete recording",
      })
    }
  }

  /**
   * Download recording
   */
  async downloadRecording(req: Request, res: Response) {
    try {
      const recording = await Recording.findById(req.params.id)

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Check access permissions
      const session = await Session.findById(recording.sessionId)
      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "Associated session not found",
        })
      }

      const hasAccess =
        recording.userId.toString() === req.user?.userId ||
        session.creator.toString() === req.user?.userId ||
        session.participants.some((p: any) => p.userId?.toString() === req.user?.userId)

      if (!hasAccess) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to download this recording",
        })
      }

      // Generate download URL
      const downloadUrl = cloudinary.utils.private_download_url(recording.cloudinaryPublicId, "video", {
        resource_type: "video",
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      })

      res.json({
        downloadUrl,
        fileName: recording.originalName,
        fileSize: recording.fileSize,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      })
    } catch (error) {
      console.error("Download recording error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to generate download link",
      })
    }
  }

  /**
   * Get recording transcription
   */
  async getTranscription(req: Request, res: Response) {
    try {
      const recording = await Recording.findById(req.params.id)

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Check access permissions
      const session = await Session.findById(recording.sessionId)
      if (!session) {
        return res.status(404).json({
          error: "Session not found",
          message: "Associated session not found",
        })
      }

      const hasAccess =
        recording.userId.toString() === req.user?.userId ||
        session.creator.toString() === req.user?.userId ||
        session.participants.some((p: any) => p.userId?.toString() === req.user?.userId)

      if (!hasAccess) {
        return res.status(403).json({
          error: "Access denied",
          message: "You don't have permission to access this transcription",
        })
      }

      if (!recording.transcription) {
        return res.status(404).json({
          error: "Transcription not found",
          message: "This recording has not been transcribed yet",
        })
      }

      res.json({
        transcription: recording.transcription,
      })
    } catch (error) {
      console.error("Get transcription error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch transcription",
      })
    }
  }

  /**
   * Request transcription for a recording
   */
  async requestTranscription(req: Request, res: Response) {
    try {
      const recording = await Recording.findById(req.params.id)

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Only recording owner can request transcription
      if (recording.userId.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the recording owner can request transcription",
        })
      }

      if (recording.status !== "completed") {
        return res.status(400).json({
          error: "Recording not ready",
          message: "Recording must be completed before transcription can be requested",
        })
      }

      if (recording.transcription) {
        return res.status(400).json({
          error: "Already transcribed",
          message: "This recording has already been transcribed",
        })
      }

      // Start transcription process
      const { language = "en-US", enableSpeakerDiarization = true } = req.body

      try {
        await transcriptionService.transcribeRecording(recording._id.toString(), {
          language,
          enableSpeakerDiarization,
          maxSpeakers: 4,
        })

        res.json({
          message: "Transcription started successfully",
          estimatedTime: "5-10 minutes",
        })
      } catch (error) {
        console.error("Transcription request error:", error)
        res.status(500).json({
          error: "Transcription failed",
          message: "Failed to start transcription process",
        })
      }
    } catch (error) {
      console.error("Request transcription error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to request transcription",
      })
    }
  }

  /**
   * Get recording analytics
   */
  async getRecordingAnalytics(req: Request, res: Response) {
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

      // Get recording statistics
      const totalRecordings = await Recording.countDocuments({
        userId,
        createdAt: { $gte: startDate },
      })

      const completedRecordings = await Recording.countDocuments({
        userId,
        status: "completed",
        createdAt: { $gte: startDate },
      })

      const transcribedRecordings = await Recording.countDocuments({
        userId,
        transcription: { $exists: true },
        createdAt: { $gte: startDate },
      })

      const totalSize = await Recording.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: "$fileSize" },
            totalDuration: { $sum: "$duration" },
          },
        },
      ])

      // Get recordings by type
      const recordingsByType = await Recording.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
            totalSize: { $sum: "$fileSize" },
          },
        },
      ])

      // Get recordings by quality
      const recordingsByQuality = await Recording.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: "$quality",
            count: { $sum: 1 },
          },
        },
      ])

      res.json({
        analytics: {
          totalRecordings,
          completedRecordings,
          transcribedRecordings,
          totalSize: totalSize[0]?.totalSize || 0,
          totalDuration: totalSize[0]?.totalDuration || 0,
          completionRate: totalRecordings > 0 ? (completedRecordings / totalRecordings) * 100 : 0,
          transcriptionRate: totalRecordings > 0 ? (transcribedRecordings / totalRecordings) * 100 : 0,
          recordingsByType,
          recordingsByQuality,
        },
      })
    } catch (error) {
      console.error("Get recording analytics error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch analytics",
      })
    }
  }

  /**
   * Share recording
   */
  async shareRecording(req: Request, res: Response) {
    try {
      const recording = await Recording.findById(req.params.id)

      if (!recording) {
        return res.status(404).json({
          error: "Recording not found",
          message: "The requested recording does not exist",
        })
      }

      // Only recording owner can share
      if (recording.userId.toString() !== req.user?.userId) {
        return res.status(403).json({
          error: "Access denied",
          message: "Only the recording owner can share the recording",
        })
      }

      const { expiresIn = "7d", allowDownload = false } = req.body

      // Calculate expiry time
      const expiryHours = {
        "1h": 1,
        "24h": 24,
        "7d": 24 * 7,
        "30d": 24 * 30,
        never: null,
      }

      const expiresAt = expiryHours[expiresIn as keyof typeof expiryHours]
        ? new Date(Date.now() + expiryHours[expiresIn as keyof typeof expiryHours]! * 60 * 60 * 1000)
        : null

      // Generate share URL with signed token
      const shareToken = require("crypto").randomBytes(32).toString("hex")

      // Store share configuration (you might want to create a separate Share model)
      const shareConfig = {
        recordingId: recording._id,
        token: shareToken,
        expiresAt,
        allowDownload,
        createdBy: req.user?.userId,
        createdAt: new Date(),
      }

      // For now, we'll store it in memory or cache
      // In production, you'd want to store this in a database
      const shareUrl = `${process.env.FRONTEND_URL}/share/${shareToken}`

      res.json({
        shareUrl,
        expiresAt,
        allowDownload,
        token: shareToken,
      })
    } catch (error) {
      console.error("Share recording error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to share recording",
      })
    }
  }
}

export const recordingController = new RecordingController()
