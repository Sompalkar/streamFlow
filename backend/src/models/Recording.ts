/**
 * Recording Model
 * MongoDB schema and model for recording data
 */

import mongoose, { Schema } from "mongoose"
import type { IRecording, IRecordingMetadata, ITranscription } from "@/types"

// Recording metadata sub-schema
const metadataSchema = new Schema<IRecordingMetadata>(
  {
    resolution: {
      type: String,
      default: null,
    },
    bitrate: {
      type: Number,
      default: null,
    },
    codec: {
      type: String,
      default: null,
    },
    fps: {
      type: Number,
      default: null,
    },
  },
  { _id: false },
)

// Transcription sub-schema
const transcriptionSchema = new Schema<ITranscription>(
  {
    text: {
      type: String,
      required: [true, "Transcription text is required"],
    },
    confidence: {
      type: Number,
      min: [0, "Confidence must be between 0 and 1"],
      max: [1, "Confidence must be between 0 and 1"],
      default: 0,
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
        },
        endTime: {
          type: Number,
          required: true,
        },
      },
    ],
    language: {
      type: String,
      default: "en-US",
    },
    provider: {
      type: String,
      enum: ["google", "openai", "web", "disabled"],
      default: "google",
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

// Main recording schema
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
      min: [0, "File size must be positive"],
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
      min: [0, "Duration must be positive"],
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
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
      default: null,
    },
    status: {
      type: String,
      enum: ["uploading", "processing", "completed", "failed"],
      default: "uploading",
    },
    metadata: {
      type: metadataSchema,
      default: null,
    },
    transcription: {
      type: transcriptionSchema,
      default: null,
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

// Virtual for file size in MB
recordingSchema.virtual("fileSizeMB").get(function () {
  return Math.round((this.fileSize / (1024 * 1024)) * 100) / 100
})

// Virtual for duration in minutes
recordingSchema.virtual("durationMinutes").get(function () {
  return Math.round((this.duration / 60) * 100) / 100
})

// Instance method to update transcription
recordingSchema.methods.updateTranscription = async function (transcriptionData: Omit<ITranscription, "processedAt">) {
  this.transcription = {
    ...transcriptionData,
    processedAt: new Date(),
  }
  return this.save()
}

// Create and export the Recording model
const Recording = mongoose.model<IRecording>("Recording", recordingSchema)

export default Recording
