/**
 * Global Type Definitions
 * Centralized type definitions for the entire application
 */

import type { Request } from "express"
import type { Types } from "mongoose"

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string
    email: string
    name: string
  }
}

// ============================================================================
// User Types
// ============================================================================

/**
 * User document interface
 */
export interface IUser {
  _id: string
  name: string
  email: string
  password: string
  avatar?: string
  isEmailVerified: boolean
  lastLoginAt?: Date
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  toJSON(): Omit<IUser, "password">
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  name: string
  email: string
  password: string
}

/**
 * User login data
 */
export interface UserLoginData {
  email: string
  password: string
}

// ============================================================================
// Session Types
// ============================================================================

/**
 * Session participant interface
 */
export interface ISessionParticipant {
  userId?: Types.ObjectId
  email?: string
  name: string
  joinedAt?: Date
  leftAt?: Date
  role: "host" | "participant"
}

/**
 * Session settings interface
 */
export interface ISessionSettings {
  maxParticipants: number
  recordVideo: boolean
  recordAudio: boolean
  allowChat: boolean
  autoTranscribe: boolean
}

/**
 * Chat message interface
 */
export interface IChatMessage {
  userId?: Types.ObjectId
  senderName: string
  message: string
  timestamp: Date
}

/**
 * Session document interface
 */
export interface ISession {
  _id: string
  title: string
  description?: string
  creator: Types.ObjectId
  participants: ISessionParticipant[]
  status: "scheduled" | "active" | "completed" | "cancelled"
  startTime?: Date
  endTime?: Date
  duration?: number
  scheduledTime?: Date
  settings: ISessionSettings
  recordings: Types.ObjectId[]
  chatMessages: IChatMessage[]
  createdAt: Date
  updatedAt: Date
  addParticipant(participantData: Partial<ISessionParticipant>): Promise<ISession>
  addChatMessage(messageData: Omit<IChatMessage, "timestamp">): Promise<ISession>
}

/**
 * Session creation data
 */
export interface SessionCreationData {
  title: string
  description?: string
  settings?: Partial<ISessionSettings>
  scheduledTime?: Date
  inviteEmails?: string[]
}

// ============================================================================
// Recording Types
// ============================================================================

/**
 * Recording metadata interface
 */
export interface IRecordingMetadata {
  resolution?: string
  bitrate?: number
  codec?: string
  fps?: number
}

/**
 * Transcription interface
 */
export interface ITranscription {
  text: string
  confidence: number
  speakers?: Array<{
    speaker: string
    text: string
    startTime: number
    endTime: number
  }>
  language: string
  provider: string
  processedAt: Date
}

/**
 * Recording document interface
 */
export interface IRecording {
  _id: string
  sessionId: Types.ObjectId
  userId: Types.ObjectId
  fileName: string
  originalName: string
  fileSize: number
  duration: number
  mimeType: string
  quality: "low" | "medium" | "high" | "4k"
  type: "video" | "audio" | "screen"
  cloudinaryUrl: string
  cloudinaryPublicId: string
  thumbnailUrl?: string
  status: "uploading" | "processing" | "completed" | "failed"
  metadata?: IRecordingMetadata
  transcription?: ITranscription
  createdAt: Date
  updatedAt: Date
  updateTranscription(transcriptionData: Omit<ITranscription, "processedAt">): Promise<IRecording>
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response structure
 */
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
  details?: any
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  error: string
  message: string
  details?: any
  statusCode?: number
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Email service types
 */
export interface EmailInvitationData {
  to: string
  sessionTitle: string
  hostName: string
  inviteLink: string
  scheduledTime?: Date
}

export interface EmailRecordingCompleteData {
  to: string
  sessionTitle: string
  recordingCount: number
  duration: number
  dashboardLink: string
}

/**
 * Recording processor types
 */
export interface RecordingProcessingOptions {
  filePath: string
  cloudinaryUrl: string
  cloudinaryPublicId: string
  sessionId: string
  userId?: string
  originalName: string
  fileSize: number
  mimeType: string
}

export interface RecordingMixingOptions {
  sessionId: string
  outputFormat?: "mp4" | "mp3" | "wav"
  quality?: "low" | "medium" | "high" | "4k"
}

/**
 * Transcription service types
 */
export interface TranscriptionOptions {
  language?: string
  enableSpeakerDiarization?: boolean
  maxSpeakers?: number
  enableAutomaticPunctuation?: boolean
  provider?: "google" | "openai" | "web" | "disabled"
}

export interface TranscriptionResult {
  text: string
  confidence: number
  speakers?: Array<{
    speaker: string
    text: string
    startTime: number
    endTime: number
  }>
  language: string
  provider: string
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * Socket authentication data
 */
export interface SocketAuthData {
  token: string
}

/**
 * WebRTC signaling data
 */
export interface WebRTCSignalData {
  targetSocketId: string
  offer?: any
  answer?: any
  candidate?: any
}

/**
 * Chat message data
 */
export interface ChatMessageData {
  sessionId: string
  message: string
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Database connection options
 */
export interface DatabaseConfig {
  uri: string
  options: {
    maxPoolSize: number
    serverSelectionTimeoutMS: number
    socketTimeoutMS: number
  }
}

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number
  corsOrigins: string[]
  jwtSecret: string
  jwtExpiresIn: string
  mongoUri: string
  cloudinaryConfig: {
    cloudName: string
    apiKey: string
    apiSecret: string
  }
}

/**
 * File upload configuration
 */
export interface UploadConfig {
  maxFileSize: number
  allowedMimeTypes: string[]
  uploadPath: string
}
