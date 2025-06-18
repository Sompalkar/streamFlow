/**
 * User Model
 * Defines the user schema for MongoDB using Mongoose
 */

import mongoose, { type Document, Schema } from "mongoose"
import bcrypt from "bcryptjs"

// Interface for User document
export interface IUser extends Document {
  _id: string
  name: string
  email: string
  password: string
  avatar?: string
  isEmailVerified: boolean
  plan: "free" | "pro" | "enterprise"
  createdAt: Date
  updatedAt: Date
  lastLoginAt?: Date

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>
  toJSON(): any
}

// User schema definition
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in queries by default
    },

    avatar: {
      type: String,
      default: null,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes for better query performance
userSchema.index({ email: 1 })
userSchema.index({ createdAt: -1 })

/**
 * Pre-save middleware to hash password
 */
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next()

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error) {
    next(error as Error)
  }
})

/**
 * Instance method to compare password
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw new Error("Password comparison failed")
  }
}

/**
 * Override toJSON to remove sensitive information
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject()
  delete userObject.password
  delete userObject.__v
  return userObject
}

/**
 * Virtual for user's full profile URL
 */
userSchema.virtual("profileUrl").get(function () {
  return `/api/users/${this._id}`
})

// Create and export the User model
const User = mongoose.model<IUser>("User", userSchema)

export default User
