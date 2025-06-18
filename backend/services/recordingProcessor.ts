/**
 * Recording Processing Service
 * Handles video/audio processing, mixing, thumbnail generation, and optimization
 */

import ffmpeg from "fluent-ffmpeg"
import path from "path"
import fs from "fs/promises"
import { v2 as cloudinary } from "cloudinary"
import Recording from "../models/Recording"

interface ProcessingOptions {
  filePath: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  sessionId: string
  userId?: string
  originalName: string
  fileSize: number
  mimeType: string
}

interface MixingOptions {
  sessionId: string
  outputFormat?: "mp4" | "mp3" | "wav"
  quality?: "low" | "medium" | "high" | "4k"
}

class RecordingProcessor {
  private initialized = false

  /**
   * Initialize the recording processor
   */
  async initialize(): Promise<void> {
    try {
      // Check if FFmpeg is available
      await this.checkFFmpegAvailability()

      // Create processing directories
      await fs.mkdir("uploads/processing", { recursive: true })
      await fs.mkdir("uploads/thumbnails", { recursive: true })
      await fs.mkdir("uploads/mixed", { recursive: true })

      this.initialized = true
      console.log("✅ Recording processor initialized")
    } catch (error) {
      console.error("❌ Recording processor initialization failed:", error)
      throw error
    }
  }

  /**
   * Check if FFmpeg is available
   */
  private async checkFFmpegAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          reject(new Error("FFmpeg not found. Please install FFmpeg to enable video processing."))
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Process a single recording file
   */
  async processRecording(options: ProcessingOptions): Promise<any> {
    try {
      if (!this.initialized) {
        throw new Error("Recording processor not initialized")
      }

      console.log(`🎬 Processing recording: ${options.originalName}`)

      // Create recording record in database
      const recording = new Recording({
        sessionId: options.sessionId,
        userId: options.userId,
        fileName: path.basename(options.filePath),
        originalName: options.originalName,
        fileSize: options.fileSize,
        mimeType: options.mimeType,
        cloudinaryUrl: options.cloudinaryUrl,
        cloudinaryPublicId: options.cloudinaryPublicId,
        status: "processing",
        type: options.mimeType.startsWith("video") ? "video" : "audio",
      })

      await recording.save()

      // Process the file based on type
      if (options.mimeType.startsWith("video")) {
        await this.processVideo(recording, options.filePath)
      } else if (options.mimeType.startsWith("audio")) {
        await this.processAudio(recording, options.filePath)
      }

      // Update recording status
      recording.status = "completed"
      await recording.save()

      // Clean up temporary file
      await this.cleanupTempFile(options.filePath)

      console.log(`✅ Recording processed successfully: ${recording._id}`)
      return recording.toJSON()
    } catch (error) {
      console.error("❌ Recording processing failed:", error)

      // Update recording status to failed
      if (options.sessionId && options.userId) {
        await Recording.findOneAndUpdate({ sessionId: options.sessionId, userId: options.userId }, { status: "failed" })
      }

      throw error
    }
  }

  /**
   * Process video file - extract metadata, generate thumbnail, optimize
   */
  private async processVideo(recording: any, filePath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Extract video metadata
        ffmpeg.ffprobe(filePath, async (err, metadata) => {
          if (err) {
            reject(err)
            return
          }

          const videoStream = metadata.streams.find((s) => s.codec_type === "video")
          const audioStream = metadata.streams.find((s) => s.codec_type === "audio")

          // Update recording metadata
          recording.duration = Math.floor(metadata.format.duration || 0)
          recording.metadata = {
            resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
            bitrate: metadata.format.bit_rate ? Number.parseInt(metadata.format.bit_rate) : undefined,
            codec: videoStream?.codec_name,
            fps: videoStream?.r_frame_rate ? this.parseFrameRate(videoStream.r_frame_rate) : undefined,
          }

          await recording.save()

          // Generate thumbnail
          await this.generateThumbnail(recording, filePath)

          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Process audio file - extract metadata, normalize audio
   */
  private async processAudio(recording: any, filePath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Extract audio metadata
        ffmpeg.ffprobe(filePath, async (err, metadata) => {
          if (err) {
            reject(err)
            return
          }

          const audioStream = metadata.streams.find((s) => s.codec_type === "audio")

          // Update recording metadata
          recording.duration = Math.floor(metadata.format.duration || 0)
          recording.metadata = {
            bitrate: metadata.format.bit_rate ? Number.parseInt(metadata.format.bit_rate) : undefined,
            codec: audioStream?.codec_name,
          }

          await recording.save()

          // Normalize audio levels
          await this.normalizeAudio(recording, filePath)

          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Generate thumbnail for video
   */
  private async generateThumbnail(recording: any, filePath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const thumbnailPath = `uploads/thumbnails/thumb-${recording._id}.jpg`

      ffmpeg(filePath)
        .screenshots({
          timestamps: ["10%"],
          filename: `thumb-${recording._id}.jpg`,
          folder: "uploads/thumbnails",
          size: "320x180",
        })
        .on("end", async () => {
          try {
            // Upload thumbnail to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(thumbnailPath, {
              folder: `studioflow/thumbnails`,
              public_id: `thumb-${recording._id}`,
              format: "jpg",
              quality: "auto",
            })

            recording.thumbnailUrl = uploadResult.secure_url
            await recording.save()

            // Clean up local thumbnail
            await fs.unlink(thumbnailPath).catch(() => {})

            resolve()
          } catch (error) {
            reject(error)
          }
        })
        .on("error", reject)
    })
  }

  /**
   * Normalize audio levels
   */
  private async normalizeAudio(recording: any, filePath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const normalizedPath = `uploads/processing/normalized-${recording._id}.mp3`

      ffmpeg(filePath)
        .audioFilters("loudnorm")
        .audioCodec("libmp3lame")
        .audioBitrate("128k")
        .output(normalizedPath)
        .on("end", async () => {
          try {
            // Upload normalized audio to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(normalizedPath, {
              resource_type: "video",
              folder: `studioflow/recordings/${recording.sessionId}`,
              public_id: `normalized-${recording._id}`,
              format: "mp3",
            })

            // Update recording with normalized version
            recording.cloudinaryUrl = uploadResult.secure_url
            recording.cloudinaryPublicId = uploadResult.public_id
            await recording.save()

            // Clean up local file
            await fs.unlink(normalizedPath).catch(() => {})

            resolve()
          } catch (error) {
            reject(error)
          }
        })
        .on("error", reject)
        .run()
    })
  }

  /**
   * Mix multiple recordings from a session into a single file
   */
  async mixSessionRecordings(options: MixingOptions): Promise<string> {
    try {
      console.log(`🎵 Mixing recordings for session: ${options.sessionId}`)

      // Get all completed recordings for the session
      const recordings = await Recording.find({
        sessionId: options.sessionId,
        status: "completed",
      }).sort({ createdAt: 1 })

      if (recordings.length === 0) {
        throw new Error("No recordings found for session")
      }

      // Download recordings from Cloudinary
      const localPaths: string[] = []
      for (const recording of recordings) {
        const localPath = await this.downloadRecording(recording)
        localPaths.push(localPath)
      }

      // Mix the recordings
      const mixedPath = await this.performMixing(localPaths, options)

      // Upload mixed recording to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(mixedPath, {
        resource_type: "video",
        folder: `studioflow/mixed/${options.sessionId}`,
        public_id: `mixed-${options.sessionId}-${Date.now()}`,
        format: options.outputFormat || "mp4",
        quality: options.quality || "medium",
      })

      // Clean up local files
      await Promise.all([
        ...localPaths.map((path) => fs.unlink(path).catch(() => {})),
        fs.unlink(mixedPath).catch(() => {}),
      ])

      console.log(`✅ Session recordings mixed successfully: ${uploadResult.secure_url}`)
      return uploadResult.secure_url
    } catch (error) {
      console.error("❌ Recording mixing failed:", error)
      throw error
    }
  }

  /**
   * Download recording from Cloudinary for processing
   */
  private async downloadRecording(recording: any): Promise<string> {
    const localPath = `uploads/processing/download-${recording._id}.${recording.type === "video" ? "mp4" : "mp3"}`

    // Use Cloudinary's download URL
    const response = await fetch(recording.cloudinaryUrl)
    const buffer = await response.arrayBuffer()

    await fs.writeFile(localPath, Buffer.from(buffer))
    return localPath
  }

  /**
   * Perform the actual mixing of multiple audio/video files
   */
  private async performMixing(filePaths: string[], options: MixingOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputPath = `uploads/mixed/mixed-${options.sessionId}-${Date.now()}.${options.outputFormat || "mp4"}`

      let command = ffmpeg()

      // Add all input files
      filePaths.forEach((filePath) => {
        command = command.input(filePath)
      })

      // Configure mixing based on file types
      if (options.outputFormat === "mp3" || filePaths.every((path) => path.endsWith(".mp3"))) {
        // Audio-only mixing
        command
          .complexFilter([`amix=inputs=${filePaths.length}:duration=longest:dropout_transition=2`])
          .audioCodec("libmp3lame")
          .audioBitrate("192k")
      } else {
        // Video mixing with audio
        const filterComplex = this.buildVideoMixingFilter(filePaths.length)
        command
          .complexFilter(filterComplex)
          .videoCodec("libx264")
          .audioCodec("aac")
          .videoBitrate("2000k")
          .audioBitrate("128k")
      }

      command
        .output(outputPath)
        .on("end", () => resolve(outputPath))
        .on("error", reject)
        .run()
    })
  }

  /**
   * Build complex filter for video mixing
   */
  private buildVideoMixingFilter(inputCount: number): string[] {
    const filters: string[] = []

    if (inputCount === 2) {
      // Side by side layout
      filters.push("[0:v]scale=640:360[v0]")
      filters.push("[1:v]scale=640:360[v1]")
      filters.push("[v0][v1]hstack=inputs=2[v]")
      filters.push("[0:a][1:a]amix=inputs=2:duration=longest[a]")
    } else if (inputCount === 3) {
      // 2x2 grid with one empty slot
      filters.push("[0:v]scale=640:360[v0]")
      filters.push("[1:v]scale=640:360[v1]")
      filters.push("[2:v]scale=640:360[v2]")
      filters.push("[v0][v1]hstack=inputs=2[top]")
      filters.push("[v2]pad=1280:360:320:0[bottom]")
      filters.push("[top][bottom]vstack=inputs=2[v]")
      filters.push("[0:a][1:a][2:a]amix=inputs=3:duration=longest[a]")
    } else if (inputCount === 4) {
      // 2x2 grid
      filters.push("[0:v]scale=640:360[v0]")
      filters.push("[1:v]scale=640:360[v1]")
      filters.push("[2:v]scale=640:360[v2]")
      filters.push("[3:v]scale=640:360[v3]")
      filters.push("[v0][v1]hstack=inputs=2[top]")
      filters.push("[v2][v3]hstack=inputs=2[bottom]")
      filters.push("[top][bottom]vstack=inputs=2[v]")
      filters.push("[0:a][1:a][2:a][3:a]amix=inputs=4:duration=longest[a]")
    } else {
      // Default: just use first input
      filters.push("[0:v]copy[v]")
      filters.push("[0:a]copy[a]")
    }

    return filters
  }

  /**
   * Parse frame rate string to number
   */
  private parseFrameRate(frameRate: string): number {
    const parts = frameRate.split("/")
    if (parts.length === 2) {
      return Math.round(Number.parseInt(parts[0]) / Number.parseInt(parts[1]))
    }
    return Number.parseInt(frameRate)
  }

  /**
   * Clean up temporary file
   */
  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn(`⚠️ Could not delete temp file: ${filePath}`)
    }
  }

  /**
   * Cleanup service resources
   */
  async cleanup(): Promise<void> {
    try {
      // Clean up any remaining temporary files
      const tempDir = "uploads/temp"
      const files = await fs.readdir(tempDir).catch(() => [])

      await Promise.all(files.map((file) => fs.unlink(path.join(tempDir, file)).catch(() => {})))

      console.log("✅ Recording processor cleaned up")
    } catch (error) {
      console.error("❌ Recording processor cleanup error:", error)
    }
  }
}

export const recordingProcessor = new RecordingProcessor()
