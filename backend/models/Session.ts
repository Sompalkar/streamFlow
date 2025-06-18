/**
 * Session Model
 * Defines the recording session schema for MongoDB
 */

import mongoose, { type Document, Schema, type Types } from "mongoose"

// Interface for Session document
export interface ISession extends Document {
  _id: string
  title: string
  description?: string
  creator: Types.ObjectId
  participants: Array<{
    userId?: Types.ObjectId
    email?: string
    name: string
    joinedAt?: Date
    leftAt?: Date
    role: "host" | "participant"
  }>
  status: "scheduled" | "active" | "completed" | "cancelled"
  startTime?: Date
  endTime?: Date
  duration?: number // in seconds
  settings: {
    maxParticipants: number
    recordVideo: boolean
    recordAudio: boolean
    allowChat: boolean
    autoTranscribe: boolean
  }
  recordings: Types.ObjectId[]
  chatMessages: Array<{
    userId?: Types.ObjectId
    senderName: string
    message: string
    timestamp: Date
  }>
  createdAt: Date
  updatedAt: Date
}

// Session schema definition
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

    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        email: {
          type: String,
          lowercase: true,
          trim: true,
        },
        name: {
          type: String,
          required: true,
          trim: true,
        },
        joinedAt: {
          type: Date,
        },
        leftAt: {
          type: Date,
        },
        role: {
          type: String,
          enum: ["host", "participant"],
          default: "participant",
        },
      },
    ],

    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled",
    },

    startTime: {
      type: Date,
    },

    endTime: {
      type: Date,
    },

    duration: {
      type: Number,
      min: 0,
    },

    settings: {
      maxParticipants: {
        type: Number,
        default: 10,
        min: 2,
        max: 50,
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

    recordings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Recording",
      },
    ],

    chatMessages: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        senderName: {
          type: String,
          required: true,
          trim: true,
        },
        message: {
          type: String,
          required: true,
          trim: true,
          maxlength: [1000, "Message cannot exceed 1000 characters"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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
sessionSchema.index({ startTime: 1 })
sessionSchema.index({ "participants.userId": 1 })

/**
 * Virtual for session URL
 */
sessionSchema.virtual("sessionUrl").get(function () {
  return `/studio/${this._id}`
})

/**
 * Virtual for participant count
 */
sessionSchema.virtual("participantCount").get(function () {
  return this.participants.length
})

/**
 * Pre-save middleware to calculate duration
 */
sessionSchema.pre("save", function (next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000)
  }
  next()
})

/**
 * Instance method to add participant
 */
sessionSchema.methods.addParticipant = function (participantData: {
  userId?: Types.ObjectId
  email?: string
  name: string
  role?: "host" | "participant"
}) {
  // Check if participant already exists
  const existingParticipant = this.participants.find(
    (p) =>
      (p.userId && participantData.userId && p.userId.equals(participantData.userId)) ||
      (p.email && participantData.email && p.email === participantData.email),
  )

  if (!existingParticipant) {
    this.participants.push({
      ...participantData,
      joinedAt: new Date(),
      role: participantData.role || "participant",
    })
  }

  return this.save()
}

/**
 * Instance method to add chat message
 */
sessionSchema.methods.addChatMessage = function (messageData: {
  userId?: Types.ObjectId
  senderName: string
  message: string
}) {
  this.chatMessages.push({
    ...messageData,
    timestamp: new Date(),
  })

  return this.save()
}

// Create and export the Session model
const Session = mongoose.model<ISession>("Session", sessionSchema)

export default Session
