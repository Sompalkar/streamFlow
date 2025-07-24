/**
 * Recording Controller
 * Handles recording-related HTTP requests
 */

import type { Request, Response, NextFunction } from "express"
import { RecordingService } from "@/services/recording.service"

export class RecordingController {
  private recordingService: RecordingService

  constructor() {
    this.recordingService = new RecordingService()
  }

  /**
   * Get all recordings for a user
   */
  getRecordings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.id
      const { page = 1, limit = 10, status, type } = req.query

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        })
        return
      }

      const result = await this.recordingService.getUserRecordings(userId, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        type: type as string,
      })

      res.status(200).json({
        success: true,
        message: "Recordings retrieved successfully",
        data: result.recordings,
        pagination: result.pagination,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get recording by ID
   */
  getRecording = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordingId } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        })
        return
      }

      const recording = await this.recordingService.getRecordingById(recordingId, userId)

      res.status(200).json({
        success: true,
        message: "Recording retrieved successfully",
        data: { recording },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update recording
   */
  updateRecording = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordingId } = req.params
      const userId = req.user?.id
      const updateData = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        })
        return
      }

      const recording = await this.recordingService.updateRecording(recordingId, userId, updateData)

      res.status(200).json({
        success: true,
        message: "Recording updated successfully",
        data: { recording },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete recording
   */
  deleteRecording = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordingId } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        })
        return
      }

      await this.recordingService.deleteRecording(recordingId, userId)

      res.status(200).json({
        success: true,
        message: "Recording deleted successfully",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Start transcription
   */
  startTranscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordingId } = req.params
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        })
        return
      }

      const result = await this.recordingService.startTranscription(recordingId, userId)

      res.status(200).json({
        success: true,
        message: "Transcription started successfully",
        data: result,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Generate share link
   */
  generateShareLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { recordingId } = req.params
      const userId = req.user?.id
      const { expiresIn = "7d" } = req.body

      if (!userId) {
        res.status(401).json({
          success: false,
          message: "Unauthorized",
        })
        return
      }

      const shareLink = await this.recordingService.generateShareLink(recordingId, userId, expiresIn)

      res.status(200).json({
        success: true,
        message: "Share link generated successfully",
        data: { shareLink },
      })
    } catch (error) {
      next(error)
    }
  }
}
