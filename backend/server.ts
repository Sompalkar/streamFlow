/**
 * Enhanced Express server for StudioFlow Recording Platform
 * Uses MVC architecture with controllers, models, and services
 */

import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import mongoose from "mongoose"
import multer from "multer"
import { v2 as cloudinary } from "cloudinary"
import path from "path"
import rateLimit from "express-rate-limit"

// Import route handlers
import authRoutes from "./routes/auth"
import sessionRoutes from "./routes/sessions"
import recordingRoutes from "./routes/recordings"
import userRoutes from "./routes/users"

// Import middleware
import { authenticateToken } from "./middleware/auth"
import { errorHandler } from "./middleware/errorHandler"

// Import WebSocket handlers
import { handleSocketConnection } from "./websocket/socketHandlers"

// Import services
import { transcriptionService } from "./services/transcriptionService"
import { recordingProcessor } from "./services/recordingProcessor"
import { emailService } from "./services/emailService"

// Load environment variables
dotenv.config()

// Create Express app
const app = express()
const server = createServer(app)

// Initialize Socket.IO with CORS configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  maxHttpBufferSize: 1e8, // 100MB for file uploads
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Constants
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/studioflow"

/**
 * Cloudinary Configuration
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Rate Limiting Configuration
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    message: "Please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: {
    error: "Upload limit exceeded",
    message: "Please wait before uploading more files",
  },
})

/**
 * Multer Configuration for File Uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/temp/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo", // .avi
      "audio/mp3",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/x-m4a",
    ]

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only video and audio files are allowed."))
    }
  },
})

/**
 * Database Connection
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0,
    })
    console.log("✅ Connected to MongoDB successfully")

    // Set up database event listeners
    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error)
    })

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected")
    })

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected")
    })
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    process.exit(1)
  }
}

/**
 * Middleware Setup
 */
// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "wss:", "ws:", "https:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        frameSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
)

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:3001",
      ]

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error("Not allowed by CORS"))
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    maxAge: 86400, // 24 hours
  }),
)

// Rate limiting
app.use("/api/", limiter)

// Body parsing middleware
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Logging middleware
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms", {
    skip: (req, res) => process.env.NODE_ENV === "test",
  }),
)

// Static file serving
app.use("/uploads", express.static("uploads"))

/**
 * Health Check Endpoint
 */
app.get("/api/health", async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected"

    // Check services status
    const transcriptionStatus = await transcriptionService.getStatus()

    res.status(200).json({
      status: "OK",
      message: "StudioFlow API is running",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbStatus,
      services: {
        transcription: transcriptionStatus,
        cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
        email: !!process.env.SENDGRID_API_KEY,
      },
    })
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
})

/**
 * API Routes
 */
// Authentication routes (public)
app.use("/api/auth", authRoutes)

// File upload endpoint with rate limiting
app.post("/api/upload/recording", uploadLimiter, authenticateToken, upload.single("recording"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded",
        message: "Please select a file to upload",
      })
    }

    const { sessionId, participantId, enableTranscription = "false" } = req.body

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID required",
        message: "Session ID is required for file upload",
      })
    }

    console.log(`📤 Uploading file: ${req.file.originalname} (${req.file.size} bytes)`)

    // Upload to Cloudinary with optimizations
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: `studioflow/recordings/${sessionId}`,
      public_id: `${participantId || req.user?.userId}-${Date.now()}`,
      quality: "auto:good",
      format: req.file.mimetype.startsWith("video/") ? "mp4" : "mp3",
      transformation: req.file.mimetype.startsWith("video/")
        ? [{ quality: "auto:good" }, { fetch_format: "auto" }]
        : [{ quality: "auto:good" }, { audio_codec: "mp3" }],
    })

    // Process the recording
    const processedRecording = await recordingProcessor.processRecording({
      filePath: req.file.path,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      sessionId,
      userId: req.user?.userId,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    })

    // Start transcription if enabled
    if (enableTranscription === "true") {
      try {
        await transcriptionService.transcribeRecording(processedRecording.id, {
          language: "en-US",
          enableSpeakerDiarization: true,
        })
      } catch (transcriptionError) {
        console.error("Transcription failed:", transcriptionError)
        // Don't fail the upload if transcription fails
      }
    }

    // Clean up temporary file
    const fs = require("fs").promises
    try {
      await fs.unlink(req.file.path)
    } catch (cleanupError) {
      console.error("Failed to cleanup temp file:", cleanupError)
    }

    res.json({
      message: "Recording uploaded successfully",
      recording: processedRecording,
      cloudinaryUrl: uploadResult.secure_url,
    })
  } catch (error) {
    console.error("Upload error:", error)

    // Clean up temporary file on error
    if (req.file?.path) {
      const fs = require("fs").promises
      try {
        await fs.unlink(req.file.path)
      } catch (cleanupError) {
        console.error("Failed to cleanup temp file:", cleanupError)
      }
    }

    res.status(500).json({
      error: "Upload failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    })
  }
})

// Protected routes (require authentication)
app.use("/api/users", authenticateToken, userRoutes)
app.use("/api/sessions", authenticateToken, sessionRoutes)
app.use("/api/recordings", authenticateToken, recordingRoutes)

// WebRTC signaling endpoint
app.post("/api/webrtc/signal", authenticateToken, (req, res) => {
  try {
    const { sessionId, targetUserId, signal, type } = req.body

    if (!sessionId || !targetUserId || !signal) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "sessionId, targetUserId, and signal are required",
      })
    }

    // Emit signal to target user via WebSocket
    io.to(`user-${targetUserId}`).emit("webrtc-signal", {
      fromUserId: req.user?.userId,
      sessionId,
      signal,
      type: type || "offer",
      timestamp: Date.now(),
    })

    res.json({
      success: true,
      message: "Signal sent successfully",
    })
  } catch (error) {
    console.error("WebRTC signaling error:", error)
    res.status(500).json({
      error: "Signaling failed",
      message: "Failed to send WebRTC signal",
    })
  }
})

// Session sharing endpoint
app.get("/api/share/:token", async (req, res) => {
  try {
    const { token } = req.params

    // In a real implementation, you'd fetch this from a database
    // For now, we'll return a placeholder response
    res.json({
      message: "Shared content access",
      token,
      // This would contain the actual shared recording/session data
    })
  } catch (error) {
    console.error("Share access error:", error)
    res.status(500).json({
      error: "Access failed",
      message: "Failed to access shared content",
    })
  }
})

// 404 handler for undefined API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
    availableEndpoints: [
      "GET /api/health",
      "POST /api/auth/login",
      "POST /api/auth/register",
      "GET /api/auth/me",
      "GET /api/sessions",
      "POST /api/sessions",
      "GET /api/recordings",
      "POST /api/upload/recording",
      "POST /api/webrtc/signal",
    ],
  })
})

// Global error handling middleware
app.use(errorHandler)

/**
 * WebSocket Connection Handling
 */
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`)

  // Handle all socket events through the enhanced socket handler
  handleSocketConnection(socket, io)

  // Handle client disconnection with cleanup
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, Reason: ${reason}`)
  })

  // Handle connection errors
  socket.on("error", (error) => {
    console.error(`🔌 Socket error for ${socket.id}:`, error)
  })

  // Handle ping/pong for connection health
  socket.on("ping", () => {
    socket.emit("pong")
  })
})

/**
 * Background Services Initialization
 */
const initializeServices = async () => {
  try {
    // Create necessary directories
    const fs = require("fs").promises
    await fs.mkdir("uploads/temp", { recursive: true })
    await fs.mkdir("uploads/processed", { recursive: true })
    console.log("✅ Upload directories created")

    // Initialize transcription service
    await transcriptionService.initialize()
    console.log("✅ Transcription service initialized")

    // Initialize recording processor
    await recordingProcessor.initialize()
    console.log("✅ Recording processor initialized")

    // Initialize email service
    await emailService.initialize()
    console.log("✅ Email service initialized")

    // Test Cloudinary connection
    try {
      await cloudinary.api.ping()
      console.log("✅ Cloudinary connection verified")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.warn("⚠️ Cloudinary connection failed:", errorMessage)
    }
  } catch (error) {
    console.error("❌ Service initialization error:", error)
    throw error
  }
}

/**
 * Server Startup
 */
const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase()

    // Initialize background services
    await initializeServices()

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 StudioFlow server running on port ${PORT}`)
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
      console.log(`🗄️  Database: ${MONGODB_URI}`)
      console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME || "Not configured"}`)
      console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`)
      console.log(`💾 Upload limit: 500MB`)
      console.log(`🔒 Rate limit: 100 requests per 15 minutes`)
      console.log(`📧 Email service: ${process.env.SENDGRID_API_KEY ? "Enabled" : "Disabled"}`)
      console.log(`🎤 Transcription: ${process.env.TRANSCRIPTION_ENABLED === "true" ? "Enabled" : "Disabled"}`)
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

/**
 * Graceful Shutdown Handler
 */
const gracefulShutdown = (signal: string) => {
  console.log(`🛑 ${signal} received, shutting down gracefully`)

  server.close(async () => {
    console.log("✅ HTTP server closed")

    try {
      // Close database connection
      await mongoose.connection.close()
      console.log("✅ Database connection closed")

      // Cleanup services
      await transcriptionService.cleanup()
      await recordingProcessor.cleanup()
      await emailService.cleanup()
      console.log("✅ Services cleaned up")

      process.exit(0)
    } catch (error) {
      console.error("❌ Error during shutdown:", error)
      process.exit(1)
    }
  })

  // Force close after 30 seconds
  setTimeout(() => {
    console.error("❌ Could not close connections in time, forcefully shutting down")
    process.exit(1)
  }, 30000)
}

// Handle process signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error)
  gracefulShutdown("UNCAUGHT_EXCEPTION")
})

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason)
  gracefulShutdown("UNHANDLED_REJECTION")
})

// Start the server
startServer()

export { app, io, server }
