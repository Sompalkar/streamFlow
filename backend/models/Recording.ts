/**
 * Recording Model
 * Defines the recording file schema for MongoDB
 */

import mongoose, { type Document, Schema, type Types } from "mongoose"

// Interface for Recording document
export interface IRecording extends Document {
  _id: string
  sessionId: Types.ObjectId
  userId: Types.ObjectId
  fileName: string
  originalName: string
  fileSize: number
  duration: number // in seconds
  mimeType: string
  quality: "low" | "medium" | "high" | "4k"
  type: "video" | "audio" | "screen"
  cloudinaryUrl: string
  cloudinaryPublicId: string
  thumbnailUrl?: string
  status: "uploading" | "processing" | "completed" | "failed"
  transcription?: {
    text: string
    language: string
    confidence: number
    speakers?: Array<{
      speaker: string
      text: string
      startTime: number
      endTime: number
    }>
    processedAt: Date
  }
  metadata: {
    resolution?: string
    bitrate?: number
    codec?: string
    fps?: number
  }
  createdAt: Date
  updatedAt: Date
}

// Recording schema definition
const recordingSchema = new Schema<IRecording>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: [true, "Session ID is required"],
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
    },

    originalName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
    },

    fileSize: {
      type: Number,
      required: [true, "File size is required"],
      min: 0,
    },

    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: 0,
    },

    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
      enum: ["video/mp4", "video/webm", "video/quicktime", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg"],
    },

    quality: {
      type: String,
      enum: ["low", "medium", "high", "4k"],
      default: "medium",
    },

    type: {
      type: String,
      enum: ["video", "audio", "screen"],
      required: [true, "Recording type is required"],
    },

    cloudinaryUrl: {
      type: String,
      required: [true, "Cloudinary URL is required"],
    },

    cloudinaryPublicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
    },

    thumbnailUrl: {
      type: String,
    },

    status: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed"],
      default: "uploading",
    },

    transcription: {
      text: {
        type: String,
      },
      language: {
        type: String,
        default: "en",
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
      },
      speakers: [
        {
          speaker: {
            type: String,
            required: true,
          },
          text: {
            type: String,
            required: true,
          },
          startTime: {
            type: Number,
            required: true,
            min: 0,
          },
          endTime: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      processedAt: {
        type: Date,
      },
    },

    metadata: {
      resolution: {
        type: String,
      },
      bitrate: {
        type: Number,
        min: 0,
      },
      codec: {
        type: String,
      },
      fps: {
        type: Number,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better query performance
recordingSchema.index({ sessionId: 1, createdAt: -1 })
recordingSchema.index({ userId: 1, createdAt: -1 })
recordingSchema.index({ status: 1 })
recordingSchema.index({ type: 1 })

/**
 * Virtual for formatted file size
 */
recordingSchema.virtual("formattedFileSize").get(function () {
  const bytes = this.fileSize
  const sizes = ["Bytes", "KB", "MB", "GB"]
  if (bytes === 0) return "0 Bytes"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i]
})

/**
 * Virtual for formatted duration
 */
recordingSchema.virtual("formattedDuration").get(function () {
  const totalSeconds = this.duration
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
})

/**
 * Instance method to update transcription
 */
recordingSchema.methods.updateTranscription = function (transcriptionData: {
  text: string
  language?: string
  confidence?: number
  speakers?: Array<{
    speaker: string
    text: string
    startTime: number
    endTime: number
  }>
}) {
  this.transcription = {
    ...transcriptionData,
    language: transcriptionData.language || "en",
    processedAt: new Date(),
  }

  return this.save()
}

// Create and export the Recording model
const Recording = mongoose.model<IRecording>("Recording", recordingSchema)

export default Recording
