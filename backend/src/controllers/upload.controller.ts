import type { Request, Response } from "express"
import { UploadService } from "@/services/upload.service"

export class UploadController {
  private uploadService: UploadService

  constructor() {
    this.uploadService = new UploadService()
  }

  async uploadRecording(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const file = req.file
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }

      const { sessionId, enableTranscription } = req.body
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required",
        })
      }

      const result = await this.uploadService.uploadRecording(file, sessionId, userId, enableTranscription === "true")

      res.status(200).json({
        success: true,
        message: "Recording uploaded successfully",
        data: result,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Upload failed",
      })
    }
  }

  async uploadAvatar(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const file = req.file
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        })
      }

      const result = await this.uploadService.uploadAvatar(file, userId)

      res.status(200).json({
        success: true,
        message: "Avatar uploaded successfully",
        data: result,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Avatar upload failed",
      })
    }
  }
}
