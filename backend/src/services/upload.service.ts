import { v2 as cloudinary } from "cloudinary"
import Recording from "@/models/Recording"
import Session from "@/models/Session"
import { TranscriptionService } from "@/services/transcription.service"
import type { Express } from "express"

export class UploadService {
  private transcriptionService: TranscriptionService

  constructor() {
    this.transcriptionService = new TranscriptionService()

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
  }

  async uploadRecording(file: Express.Multer.File, sessionId: string, userId: string, enableTranscription = false) {
    try {
      console.log(`📤 Uploading recording for session: ${sessionId}`)

      // Upload to Cloudinary
      const uploadResult = (await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "video",
              folder: "recordings",
              public_id: `recording_${sessionId}_${Date.now()}`,
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            },
          )
          .end(file.buffer)
      })) as any

      // Create recording document
      const recording = new Recording({
        sessionId,
        userId,
        fileName: file.filename || `recording_${Date.now()}.webm`,
        originalName: file.originalname,
        fileSize: file.size,
        duration: 0, // Will be updated later
        mimeType: file.mimetype,
        quality: "medium",
        type: file.mimetype.startsWith("video") ? "video" : "audio",
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        status: "completed",
        metadata: {
          resolution:
            uploadResult.width && uploadResult.height ? `${uploadResult.width}x${uploadResult.height}` : undefined,
          bitrate: uploadResult.bit_rate,
          codec: uploadResult.format,
        },
      })

      await recording.save()

      // Add recording to session
      const session = await Session.findById(sessionId)
      if (session) {
        session.recordings.push(recording._id as any)
        await session.save()
      }

      // Start transcription if enabled
      if (enableTranscription) {
        try {
          await this.transcriptionService.transcribeRecording(recording._id.toString(), {
            language: "en-US",
            enableSpeakerDiarization: true,
          })
        } catch (transcriptionError) {
          console.error("Transcription failed:", transcriptionError)
        }
      }

      console.log(`✅ Recording uploaded successfully: ${recording._id}`)

      return {
        recording: {
          id: recording._id.toString(),
          fileName: recording.fileName,
          cloudinaryUrl: recording.cloudinaryUrl,
          fileSize: recording.fileSize,
          status: recording.status,
          createdAt: recording.createdAt,
        },
      }
    } catch (error) {
      console.error("❌ Upload failed:", error)
      throw new Error("Failed to upload recording")
    }
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    try {
      console.log(`📤 Uploading avatar for user: ${userId}`)

      // Upload to Cloudinary
      const uploadResult = (await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "image",
              folder: "avatars",
              public_id: `avatar_${userId}`,
              transformation: [
                { width: 200, height: 200, crop: "fill", gravity: "face" },
                { quality: "auto", fetch_format: "auto" },
              ],
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            },
          )
          .end(file.buffer)
      })) as any

      console.log(`✅ Avatar uploaded successfully for user: ${userId}`)

      return {
        avatarUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      }
    } catch (error) {
      console.error("❌ Avatar upload failed:", error)
      throw new Error("Failed to upload avatar")
    }
  }
}
