/**
 * Session Model
 * MongoDB schema and model for recording session data
 */

import mongoose, { Schema } from "mongoose"
import type { ISession, ISessionParticipant, IChatMessage, ISessionSettings } from "@/types"

// Session participant sub-schema
const participantSchema = new Schema<ISessionParticipant>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    email: {
      type: String,
      required: false,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Participant name is required"],
      trim: true,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["host", "participant"],
      default: "participant",
    },
  },
  { _id: false },
)

// Chat message sub-schema
const chatMessageSchema = new Schema<IChatMessage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    senderName: {
      type: String,
      required: [true, "Sender name is required"],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Message content is required"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

// Session settings sub-schema
const settingsSchema = new Schema<ISessionSettings>(
  {
    maxParticipants: {
      type: Number,
      default: 10,
      min: [2, "Maximum participants must be at least 2"],
      max: [50, "Maximum participants cannot exceed 50"],
    },
    recordVideo: {
      type: Boolean,
      default: true,
    },
    recordAudio: {
      type: Boolean,
      default: true,
    },
    allowChat: {
      type: Boolean,
      default: true,
    },
    autoTranscribe: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
)

// Main session schema
const sessionSchema = new Schema<ISession>(
  {
    title: {
      type: String,
      required: [true, "Session title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Session creator is required"],
    },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled",
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    scheduledTime: {
      type: Date,
      default: null,
    },
    settings: {
      type: settingsSchema,
      default: () => ({}),
    },
    recordings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Recording",
      },
    ],
    chatMessages: [chatMessageSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better query performance
sessionSchema.index({ creator: 1, createdAt: -1 })
sessionSchema.index({ status: 1 })
sessionSchema.index({ "participants.userId": 1 })
sessionSchema.index({ scheduledTime: 1 })

// Virtual for calculating duration
sessionSchema.virtual("calculatedDuration").get(function () {
  if (this.startTime && this.endTime) {
    return Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000)
  }
  return 0
})

// Instance method to add participant
sessionSchema.methods.addParticipant = async function (participantData: Partial<ISessionParticipant>) {
  this.participants.push(participantData)
  return this.save()
}

// Instance method to add chat message
sessionSchema.methods.addChatMessage = async function (messageData: Omit<IChatMessage, "timestamp">) {
  this.chatMessages.push({
    ...messageData,
    timestamp: new Date(),
  })
  return this.save()
}

// Pre-save middleware to update duration
sessionSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000)
  }
  next()
})

// Create and export the Session model
const Session = mongoose.model<ISession>("Session", sessionSchema)

export default Session
