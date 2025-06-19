/**
 * User Controller
 * Handles user-related business logic
 */

import type { Request, Response } from "express"
import { validationResult } from "express-validator"
import User from "../models/User"
import Session from "../models/Session"
import Recording from "../models/Recording"

export class UserController {
  /**
   * Get user profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const user = await User.findById(req.user?.userId)
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User account no longer exists",
        })
      }

      res.json({
        user: user.toJSON(),
      })
    } catch (error) {
      console.error("Get profile error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch user profile",
      })
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const user = await User.findById(req.user?.userId)
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User account no longer exists",
        })
      }

      const { name, email, avatar } = req.body

      // Check if email is already taken by another user
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ email, _id: { $ne: user._id } })
        if (existingUser) {
          return res.status(409).json({
            error: "Email already taken",
            message: "This email address is already in use",
          })
        }
        user.email = email
        user.isEmailVerified = false // Reset verification if email changed
      }

      if (name) user.name = name
      if (avatar) user.avatar = avatar

      await user.save()

      res.json({
        message: "Profile updated successfully",
        user: user.toJSON(),
      })
    } catch (error) {
      console.error("Update profile error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update profile",
      })
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response) {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        })
      }

      const { currentPassword, newPassword } = req.body

      const user = await User.findById(req.user?.userId).select("+password")
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User account no longer exists",
        })
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: "Invalid password",
          message: "Current password is incorrect",
        })
      }

      // Update password
      user.password = newPassword
      await user.save()

      res.json({
        message: "Password changed successfully",
      })
    } catch (error) {
      console.error("Change password error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to change password",
      })
    }
  }

  /**
   * Get user dashboard statistics
   */
  async getDashboardStats(req: Request, res: Response) {
    try {
      const userId = req.user?.userId

      // Get session statistics
      const totalSessions = await Session.countDocuments({
        $or: [{ creator: userId }, { "participants.userId": userId }],
      })

      const activeSessions = await Session.countDocuments({
        $or: [{ creator: userId }, { "participants.userId": userId }],
        status: "active",
      })

      const completedSessions = await Session.countDocuments({
        $or: [{ creator: userId }, { "participants.userId": userId }],
        status: "completed",
      })

      // Get recording statistics
      const totalRecordings = await Recording.countDocuments({ userId })

      const completedRecordings = await Recording.countDocuments({
        userId,
        status: "completed",
      })

      const transcribedRecordings = await Recording.countDocuments({
        userId,
        transcription: { $exists: true },
      })

      // Get total recording duration and size
      const recordingStats = await Recording.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalDuration: { $sum: "$duration" },
            totalSize: { $sum: "$fileSize" },
          },
        },
      ])

      // Get recent sessions
      const recentSessions = await Session.find({
        $or: [{ creator: userId }, { "participants.userId": userId }],
      })
        .populate("creator", "name email avatar")
        .sort({ createdAt: -1 })
        .limit(5)

      // Get recent recordings
      const recentRecordings = await Recording.find({ userId })
        .populate("sessionId", "title")
        .sort({ createdAt: -1 })
        .limit(5)

      res.json({
        stats: {
          sessions: {
            total: totalSessions,
            active: activeSessions,
            completed: completedSessions,
          },
          recordings: {
            total: totalRecordings,
            completed: completedRecordings,
            transcribed: transcribedRecordings,
            totalDuration: recordingStats[0]?.totalDuration || 0,
            totalSize: recordingStats[0]?.totalSize || 0,
          },
        },
        recentSessions,
        recentRecordings,
      })
    } catch (error) {
      console.error("Get dashboard stats error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch dashboard statistics",
      })
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const { password } = req.body

      const user = await User.findById(req.user?.userId).select("+password")
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User account no longer exists",
        })
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        return res.status(400).json({
          error: "Invalid password",
          message: "Password is incorrect",
        })
      }

      // Delete user's recordings from cloud storage
      const recordings = await Recording.find({ userId: user._id })
      for (const recording of recordings) {
        try {
          const cloudinary = require("cloudinary").v2
          await cloudinary.uploader.destroy(recording.cloudinaryPublicId, {
            resource_type: "video",
          })
        } catch (error) {
          console.error("Failed to delete recording from cloud:", error)
        }
      }

      // Delete user's data
      await Recording.deleteMany({ userId: user._id })
      await Session.deleteMany({ creator: user._id })

      // Remove user from other sessions
      await Session.updateMany({ "participants.userId": user._id }, { $pull: { participants: { userId: user._id } } })

      // Delete user account
      await User.findByIdAndDelete(user._id)

      res.json({
        message: "Account deleted successfully",
      })
    } catch (error) {
      console.error("Delete account error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to delete account",
      })
    }
  }

  /**
   * Get user preferences
   */
  async getPreferences(req: Request, res: Response) {
    try {
      const user = await User.findById(req.user?.userId)
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User account no longer exists",
        })
      }

      // Return user preferences (you might want to add a preferences field to the User model)
      const preferences = {
        theme: "system",
        notifications: {
          email: true,
          browser: true,
          recordingComplete: true,
          sessionInvites: true,
        },
        recording: {
          defaultQuality: "high",
          autoTranscribe: false,
          autoSave: true,
        },
        privacy: {
          profileVisible: true,
          allowInvites: true,
        },
      }

      res.json({
        preferences,
      })
    } catch (error) {
      console.error("Get preferences error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to fetch preferences",
      })
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req: Request, res: Response) {
    try {
      const user = await User.findById(req.user?.userId)
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          message: "User account no longer exists",
        })
      }

      const { preferences } = req.body

      // In a real implementation, you'd save these to a preferences field
      // For now, we'll just return success
      res.json({
        message: "Preferences updated successfully",
        preferences,
      })
    } catch (error) {
      console.error("Update preferences error:", error)
      res.status(500).json({
        error: "Internal server error",
        message: "Failed to update preferences",
      })
    }
  }
}

export const userController = new UserController()
