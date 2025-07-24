import type { Request, Response } from "express"
import { SessionService } from "@/services/session.service"

export class SessionController {
  private sessionService: SessionService

  constructor() {
    this.sessionService = new SessionService()
  }

  async getSessions(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const page = Number.parseInt(req.query.page as string) || 1
      const limit = Number.parseInt(req.query.limit as string) || 10

      const result = await this.sessionService.getSessionsByUser(userId, page, limit)

      res.status(200).json({
        success: true,
        message: "Sessions retrieved successfully",
        data: result.sessions,
        pagination: result.pagination,
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve sessions",
      })
    }
  }

  async createSession(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const sessionData = {
        ...req.body,
        creator: userId,
      }

      const session = await this.sessionService.createSession(sessionData)

      res.status(201).json({
        success: true,
        message: "Session created successfully",
        data: { session },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create session",
      })
    }
  }

  async getSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params
      const session = await this.sessionService.getSessionById(sessionId)

      res.status(200).json({
        success: true,
        message: "Session retrieved successfully",
        data: { session },
      })
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "Session not found",
      })
    }
  }

  async updateSession(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      const session = await this.sessionService.updateSession(sessionId, userId, req.body)

      res.status(200).json({
        success: true,
        message: "Session updated successfully",
        data: { session },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update session",
      })
    }
  }

  async deleteSession(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      await this.sessionService.deleteSession(sessionId, userId)

      res.status(200).json({
        success: true,
        message: "Session deleted successfully",
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete session",
      })
    }
  }

  async joinSession(req: Request, res: Response) {
    try {
      const { sessionId } = req.params
      const userId = req.user?.id
      const { guestName } = req.body

      const session = await this.sessionService.joinSession(sessionId, userId, guestName)

      res.status(200).json({
        success: true,
        message: "Joined session successfully",
        data: { session },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to join session",
      })
    }
  }

  async leaveSession(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      await this.sessionService.leaveSession(sessionId, userId)

      res.status(200).json({
        success: true,
        message: "Left session successfully",
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to leave session",
      })
    }
  }

  async startRecording(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      const session = await this.sessionService.startRecording(sessionId, userId)

      res.status(200).json({
        success: true,
        message: "Recording started successfully",
        data: { session },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to start recording",
      })
    }
  }

  async stopRecording(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      const session = await this.sessionService.stopRecording(sessionId, userId)

      res.status(200).json({
        success: true,
        message: "Recording stopped successfully",
        data: { session },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to stop recording",
      })
    }
  }

  async getSessionRecordings(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      const recordings = await this.sessionService.getSessionRecordings(sessionId, userId)

      res.status(200).json({
        success: true,
        message: "Recordings retrieved successfully",
        data: { recordings },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to retrieve recordings",
      })
    }
  }

  async getAnalytics(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { sessionId } = req.params
      const analytics = await this.sessionService.getSessionAnalytics(sessionId, userId)

      res.status(200).json({
        success: true,
        message: "Analytics retrieved successfully",
        data: { analytics },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to retrieve analytics",
      })
    }
  }
}
