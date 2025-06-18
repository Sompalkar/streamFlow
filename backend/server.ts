/**
 * Main Express server for StudioFlow Recording Platform
 * Handles API routes, WebSocket connections, and middleware setup
 */

import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import mongoose from "mongoose"

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
})

// Constants
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/studioflow"

/**
 * Database Connection
 * Connect to MongoDB using Mongoose
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log("✅ Connected to MongoDB successfully")
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
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        mediaSrc: ["'self'", "blob:"],
      },
    },
  }),
)

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "50mb" })) // Increased limit for file uploads
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

// Logging middleware
app.use(morgan("combined"))

/**
 * API Routes
 */
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "StudioFlow API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// Authentication routes (public)
app.use("/api/auth", authRoutes)

// Protected routes (require authentication)
app.use("/api/users", authenticateToken, userRoutes)
app.use("/api/sessions", authenticateToken, sessionRoutes)
app.use("/api/recordings", authenticateToken, recordingRoutes)

// 404 handler for undefined routes
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `The requested endpoint ${req.originalUrl} does not exist`,
  })
})

// Global error handling middleware
app.use(errorHandler)

/**
 * WebSocket Connection Handling
 * Handle real-time communication for recording sessions and chat
 */
io.on("connection", (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`)

  // Handle all socket events through the socket handler
  handleSocketConnection(socket, io)

  // Handle client disconnection
  socket.on("disconnect", (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, Reason: ${reason}`)
  })
})

/**
 * Server Startup
 */
const startServer = async () => {
  try {
    // Connect to database first
    await connectDatabase()

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 StudioFlow server running on port ${PORT}`)
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
      console.log(`🗄️  Database: ${MONGODB_URI}`)
      console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`)
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully")
  server.close(() => {
    console.log("✅ Server closed")
    mongoose.connection.close()
    process.exit(0)
  })
})

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully")
  server.close(() => {
    console.log("✅ Server closed")
    mongoose.connection.close()
    process.exit(0)
  })
})

// Start the server
startServer()

export { app, io }
