/**
 * Recording Service
 * Handles recording-related business logic and database operations
 */

import Recording from "@/models/Recording"
import Session from "@/models/Session"
import type { IRecording } from "@/types"
import { AppError } from "@/middleware/error.middleware"
import { TranscriptionService } from "@/services/transcription.service"
import { v2 as cloudinary } from "cloudinary"

export class RecordingService {
  private transcriptionService: TranscriptionService

  constructor() {
    this.transcriptionService = new TranscriptionService()
  }

  /**
   * Get user recordings with pagination and filtering
   */
  async getUserRecordings(
    userId: string,
    options: {
      page: number
      limit: number
      status?: string
      type?: string
      sessionId?: string
    },
  ): Promise<{
    recordings: IRecording[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    try {
      const { page, limit, status, type, sessionId } = options

      // Build query
      const query: any = { userId }

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
        .limit(limit)
        .skip((page - 1) * limit)

      const total = await Recording.countDocuments(query)

      return {
        recordings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      }
    } catch (error) {
      console.error("Get user recordings error:", error)
      throw new AppError("Failed to fetch recordings", 500)
    }
  }

  /**
   * Get recording by ID with access control
   */
  async getRecordingById(recordingId: string, userId: string): Promise<IRecording> {
    try {
      const recording = await Recording.findById(recordingId)
        .populate("sessionId", "title description creator participants")
        .populate("userId", "name email avatar")

      if (!recording) {
        throw new AppError("Recording not found", 404)
      }

      // Check access permissions
      const session = recording.sessionId as any
      const hasAccess =
        recording.userId.toString() === userId ||
        session.creator.toString() === userId ||
        session.participants.some((p: any) => p.userId?.toString() === userId)

      if (!hasAccess) {
        throw new AppError("Access denied to this recording", 403)
      }

      return recording
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      console.error("Get recording by ID error:", error)
      throw new AppError("Failed to fetch recording", 500)
    }
  }

  /**
   * Update recording metadata
   */
  async updateRecording(recordingId: string, userId: string, updateData: any): Promise<IRecording> {
    try {
      const recording = await Recording.findById(recordingId)

      if (!recording) {
        throw new AppError("Recording not found", 404)
      }

      // Only owner can update recording
      if (recording.userId.toString() !== userId) {
        throw new AppError("Only the recording owner can update it", 403)
      }

      // Update allowed fields
      if (updateData.fileName) recording.fileName = updateData.fileName
      if (updateData.originalName) recording.originalName = updateData.originalName

      await recording.save()
      return recording
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      console.error("Update recording error:", error)
      throw new AppError("Failed to update recording", 500)
    }
  }

  /**
   * Delete recording
   */
  async deleteRecording(recordingId: string, userId: string): Promise<void> {
    try {
      const recording = await Recording.findById(recordingId)

      if (!recording) {
        throw new AppError("Recording not found", 404)
      }

      // Only owner can delete recording
      if (recording.userId.toString() !== userId) {
        throw new AppError("Only the recording owner can delete it", 403)
      }

      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(recording.cloudinaryPublicId, {
          resource_type: "video",
        })

        if (recording.thumbnailUrl) {
          const thumbnailPublicId = recording.cloudinaryPublicId.replace(/\.[^/.]+$/, "") + "_thumb"
          await cloudinary.uploader.destroy(thumbnailPublicId)
        }
      } catch (error) {
        console.error("Failed to delete from Cloudinary:", error)
      }

      // Remove from session recordings array
      await Session.updateOne({ _id: recording.sessionId }, { $pull: { recordings: recordingId } })

      // Delete from database
      await Recording.findByIdAndDelete(recordingId)
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      console.error("Delete recording error:", error)
      throw new AppError("Failed to delete recording", 500)
    }
  }

  /**
   * Transcribe recording
   */
  async transcribeRecording(
    recordingId: string,
    userId: string,
    options: { language?: string; enableSpeakerDiarization?: boolean },
  ): Promise<any> {
    try {
      const recording = await this.getRecordingById(recordingId, userId)

      if (recording.status !== "completed") {
        throw new AppError("Recording must be completed before transcription", 400)
      }

      // Start transcription process
      const result = await this.transcriptionService.transcribeRecording(recordingId, {
        language: options.language || "en-US",
        enableSpeakerDiarization: options.enableSpeakerDiarization || false,
      })

      return result
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      console.error("Transcribe recording error:", error)
      throw new AppError("Failed to start transcription", 500)
    }
  }

  /**
   * Generate shareable link
   */
  async generateShareLink(
    recordingId: string,
    userId: string,
    options: { expiresIn?: string; allowDownload?: boolean },
  ): Promise<string> {
    try {
      const recording = await this.getRecordingById(recordingId, userId)

      // Generate signed URL from Cloudinary
      const timestamp = Math.round(new Date().getTime() / 1000)
      const expirationTime = this.calculateExpiration(options.expiresIn || "24h")

      const shareUrl = cloudinary.utils.private_download_url(recording.cloudinaryPublicId, "video", {
        expires_at: timestamp + expirationTime,
        attachment: options.allowDownload !== false,
      })

      return shareUrl
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      console.error("Generate share link error:", error)
      throw new AppError("Failed to generate share link", 500)
    }
  }

  /**
   * Get download URL
   */
  async getDownloadUrl(recordingId: string, userId: string): Promise<string> {
    try {
      const recording = await this.getRecordingById(recordingId, userId)

      // Generate download URL from Cloudinary
      const downloadUrl = cloudinary.utils.private_download_url(recording.cloudinaryPublicId, "video", {
        attachment: true,
        expires_at: Math.round(new Date().getTime() / 1000) + 3600, // 1 hour
      })

      return downloadUrl
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      console.error("Get download URL error:", error)
      throw new AppError("Failed to generate download URL", 500)
    }
  }

  /**
   * Calculate expiration time in seconds
   */
  private calculateExpiration(expiresIn: string): number {
    const timeMap: { [key: string]: number } = {
      "1h": 3600,
      "24h": 86400,
      "7d": 604800,
      "30d": 2592000,
      never: 31536000, // 1 year
    }

    return timeMap[expiresIn] || 86400 // Default to 24 hours
  }
}
