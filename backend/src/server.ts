/**
 * StudioFlow Recording Platform Server
 * Clean Express server with MVC architecture
 */

import express from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
import dotenv from "dotenv"
import { createServer } from "http"
import { Server as SocketIOServer } from "socket.io"
import rateLimit from "express-rate-limit"

// Import configurations and utilities
// import { connectDatabase } from "@/config/database"
import { connectDatabase } from "./config/database"
import { initializeServices } from "./config/services"

// Import middleware
// import { errorHandler, notFoundHandler } from "@/middleware/error.middleware"
import { errorHandler, notFoundHandler } from "./middleware/error.middleware"

// Import routes
import authRoutes from "./routes/auth.routes"
import sessionRoutes from "./routes/session.routes"
import recordingRoutes from "./routes/recording.routes"
import uploadRoutes from "./routes/upload.routes"

// Import WebSocket handlers
import { setupWebSocket } from "./websocket/socket.handlers"

// Load environment variables
dotenv.config()

// Create Express app and HTTP server
const app = express()
const server = createServer(app)

// Initialize Socket.IO
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

/**
 * Security and CORS Configuration
 */
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

/**
 * Rate Limiting
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    message: "Please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use("/api/", generalLimiter)

/**
 * Body Parsing Middleware
 */
app.use(express.json({ limit: "50mb" }))
app.use(express.urlencoded({ extended: true, limit: "50mb" }))

/**
 * Logging Middleware
 */
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms", {
    skip: (req, res) => process.env.NODE_ENV === "test",
  }),
)

/**
 * Static File Serving
 */
app.use("/uploads", express.static("uploads"))

/**
 * Health Check Endpoint
 */
app.get("/api/health", async (req, res) => {
  try {
    const healthCheck = {
      status: "OK",
      message: "StudioFlow API is running",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }

    res.status(200).json(healthCheck)
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
app.use("/api/auth", authRoutes)
app.use("/api/sessions", sessionRoutes)
app.use("/api/recordings", recordingRoutes)
app.use("/api/upload", uploadRoutes)

/**
 * WebSocket Setup
 */
setupWebSocket(io)

/**
 * Error Handling
 */
app.use("/api/*", notFoundHandler)
app.use(errorHandler)

/**
 * Server Startup
 */
const startServer = async (): Promise<void> => {
  try {
    // Connect to database
    await connectDatabase()
    console.log("✅ Database connected successfully")

    // Initialize services
    await initializeServices()
    console.log("✅ Services initialized successfully")

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 StudioFlow server running on port ${PORT}`)
      console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`)
      console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`)
      console.log(`💾 Upload limit: 500MB`)
      console.log(`🔒 Rate limit: 100 requests per 15 minutes`)
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error)
    process.exit(1)
  }
}

/**
 * Graceful Shutdown
 */
const gracefulShutdown = (signal: string): void => {
  console.log(`🛑 ${signal} received, shutting down gracefully`)

  server.close(async () => {
    console.log("✅ HTTP server closed")
    process.exit(0)
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
