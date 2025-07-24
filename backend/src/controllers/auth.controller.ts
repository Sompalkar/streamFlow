import type { Request, Response } from "express"
import { AuthService } from "@/services/auth.service"

export class AuthController {
  private authService: AuthService

  constructor() {
    this.authService = new AuthService()
  }

  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body
      const result = await this.authService.register(name, email, password)

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      })
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const result = await this.authService.login(email, password)

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      })
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || "Login failed",
      })
    }
  }

  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const user = await this.authService.getUserById(userId)

      res.status(200).json({
        success: true,
        message: "Profile retrieved successfully",
        data: { user },
      })
    } catch (error: any) {
      res.status(404).json({
        success: false,
        message: error.message || "User not found",
      })
    }
  }

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const updateData = req.body
      const updatedUser = await this.authService.updateUserProfile(userId, updateData)

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: { user: updatedUser },
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Profile update failed",
      })
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const { currentPassword, newPassword } = req.body
      await this.authService.changePassword(userId, currentPassword, newPassword)

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
      })
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Password change failed",
      })
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body
      const userId = req.user?.id
      const email = req.user?.email

      if (!userId || !email) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        })
      }

      const newToken = await this.authService.refreshToken(userId, email)

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: { token: newToken },
      })
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || "Token refresh failed",
      })
    }
  }

  async logout(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      if (userId) {
        await this.authService.logout(userId)
      }

      res.status(200).json({
        success: true,
        message: "Logout successful",
      })
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Logout failed",
      })
    }
  }
}
