/**
 * WebSocket Event Handlers
 * Handles real-time communication for recording sessions
 */

import type { Socket, Server as SocketIOServer } from "socket.io"
import jwt from "jsonwebtoken"
import Session from "@/models/Session"
import User from "@/models/User"

// Interface for authenticated socket
interface AuthenticatedSocket extends Socket {
  userId?: string
  userName?: string
  currentSession?: string
}

// Active sessions and participants tracking
const activeSessions = new Map<string, Set<string>>() // sessionId -> Set of socketIds
const socketToSession = new Map<string, string>() // socketId -> sessionId
const socketToUser = new Map<string, { userId: string; userName: string }>() // socketId -> user info

/**
 * Setup WebSocket server and event handlers
 */
export const setupWebSocket = (io: SocketIOServer): void => {
  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`🔌 New client connected: ${socket.id}`)

    // Handle authentication
    socket.on("authenticate", async (data: { token: string }) => {
      try {
        const isAuthenticated = await authenticateSocket(socket, data.token)

        if (isAuthenticated) {
          socket.emit("authenticated", {
            success: true,
            userId: socket.userId,
            userName: socket.userName,
          })
          console.log(`✅ Socket authenticated: ${socket.id} (${socket.userName})`)
        } else {
          socket.emit("authenticated", { success: false, error: "Invalid token" })
          socket.disconnect()
        }
      } catch (error) {
        console.error("Authentication error:", error)
        socket.emit("authenticated", { success: false, error: "Authentication failed" })
        socket.disconnect()
      }
    })

    // Handle joining session
    socket.on("join-session", async (data: { sessionId: string }) => {
      await handleJoinSession(socket, io, data.sessionId)
    })

    // Handle leaving session
    socket.on("leave-session", async () => {
      await handleLeaveSession(socket, io)
    })

    // Handle recording controls
    socket.on("start-recording", async (data: { sessionId: string }) => {
      await handleStartRecording(socket, io, data.sessionId)
    })

    socket.on("stop-recording", async (data: { sessionId: string }) => {
      await handleStopRecording(socket, io, data.sessionId)
    })

    // Handle chat messages
    socket.on("chat-message", async (data: { sessionId: string; message: string }) => {
      await handleChatMessage(socket, io, data)
    })

    // Handle media controls
    socket.on("toggle-audio", (data: { sessionId: string; isMuted: boolean }) => {
      handleMediaToggle(socket, io, "audio", data)
    })

    socket.on("toggle-video", (data: { sessionId: string; isVideoOff: boolean }) => {
      handleMediaToggle(socket, io, "video", data)
    })

    // Handle WebRTC signaling
    socket.on("webrtc-offer", (data: { targetSocketId: string; offer: any }) => {
      handleWebRTCSignal(socket, io, "offer", data)
    })

    socket.on("webrtc-answer", (data: { targetSocketId: string; answer: any }) => {
      handleWebRTCSignal(socket, io, "answer", data)
    })

    socket.on("webrtc-ice-candidate", (data: { targetSocketId: string; candidate: any }) => {
      handleWebRTCSignal(socket, io, "ice-candidate", data)
    })

    // Handle disconnection
    socket.on("disconnect", async (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id}, Reason: ${reason}`)
      await handleLeaveSession(socket, io)
    })

    // Handle errors
    socket.on("error", (error) => {
      console.error(`🔌 Socket error for ${socket.id}:`, error)
    })
  })
}

/**
 * Authenticate socket connection using JWT token
 */
const authenticateSocket = async (socket: AuthenticatedSocket, token: string): Promise<boolean> => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: string }
    const user = await User.findById(decoded.userId)

    if (!user) {
      return false
    }

    socket.userId = user._id.toString()
    socket.userName = user.name
    socketToUser.set(socket.id, { userId: user._id.toString(), userName: user.name })

    return true
  } catch (error) {
    console.error("Socket authentication error:", error)
    return false
  }
}

/**
 * Handle joining a session
 */
const handleJoinSession = async (socket: AuthenticatedSocket, io: SocketIOServer, sessionId: string): Promise<void> => {
  try {
    if (!socket.userId) {
      socket.emit("error", { message: "Not authenticated" })
      return
    }

    // Verify session exists and user has access
    const session = await Session.findById(sessionId).populate("creator", "name email")
    if (!session) {
      socket.emit("error", { message: "Session not found" })
      return
    }

    // Check if user is a participant or creator
    const isParticipant = session.participants.some(
      (p) => p.userId?.toString() === socket.userId || session.creator._id.toString() === socket.userId,
    )

    if (!isParticipant) {
      socket.emit("error", { message: "Access denied to session" })
      return
    }

    // Join socket room
    socket.join(sessionId)
    socket.currentSession = sessionId
    socketToSession.set(socket.id, sessionId)

    // Track active participants
    if (!activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, new Set())
    }
    activeSessions.get(sessionId)!.add(socket.id)

    // Update participant join time
    const participant = session.participants.find((p) => p.userId?.toString() === socket.userId)
    if (participant && !participant.joinedAt) {
      participant.joinedAt = new Date()
      await session.save()
    }

    // Notify other participants
    socket.to(sessionId).emit("participant-joined", {
      userId: socket.userId,
      userName: socket.userName,
      socketId: socket.id,
    })

    // Send current session state to new participant
    const activeParticipants = Array.from(activeSessions.get(sessionId) || [])
      .map((socketId) => socketToUser.get(socketId))
      .filter(Boolean)

    socket.emit("session-joined", {
      sessionId,
      participants: activeParticipants,
      session: session.toJSON(),
    })

    console.log(`👥 User ${socket.userName} joined session ${sessionId}`)
  } catch (error) {
    console.error("Join session error:", error)
    socket.emit("error", { message: "Failed to join session" })
  }
}

/**
 * Handle leaving a session
 */
const handleLeaveSession = async (socket: AuthenticatedSocket, io: SocketIOServer): Promise<void> => {
  try {
    const sessionId = socketToSession.get(socket.id)
    if (!sessionId) return

    // Remove from active sessions
    const sessionSockets = activeSessions.get(sessionId)
    if (sessionSockets) {
      sessionSockets.delete(socket.id)
      if (sessionSockets.size === 0) {
        activeSessions.delete(sessionId)
      }
    }

    // Update participant leave time
    if (socket.userId) {
      const session = await Session.findById(sessionId)
      if (session) {
        const participant = session.participants.find((p) => p.userId?.toString() === socket.userId)
        if (participant && !participant.leftAt) {
          participant.leftAt = new Date()
          await session.save()
        }
      }
    }

    // Notify other participants
    socket.to(sessionId).emit("participant-left", {
      userId: socket.userId,
      userName: socket.userName,
      socketId: socket.id,
    })

    // Clean up tracking maps
    socketToSession.delete(socket.id)
    socketToUser.delete(socket.id)

    console.log(`👋 User ${socket.userName} left session ${sessionId}`)
  } catch (error) {
    console.error("Leave session error:", error)
  }
}

/**
 * Handle starting recording
 */
const handleStartRecording = async (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  sessionId: string,
): Promise<void> => {
  try {
    const session = await Session.findById(sessionId)
    if (!session) return

    // Only session creator can start recording
    if (session.creator.toString() !== socket.userId) {
      socket.emit("error", { message: "Only session creator can start recording" })
      return
    }

    // Update session status
    session.status = "active"
    session.startTime = new Date()
    await session.save()

    // Notify all participants
    io.to(sessionId).emit("recording-started", {
      startTime: session.startTime,
      startedBy: socket.userName,
    })

    console.log(`🔴 Recording started for session ${sessionId} by ${socket.userName}`)
  } catch (error) {
    console.error("Start recording error:", error)
    socket.emit("error", { message: "Failed to start recording" })
  }
}

/**
 * Handle stopping recording
 */
const handleStopRecording = async (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  sessionId: string,
): Promise<void> => {
  try {
    const session = await Session.findById(sessionId)
    if (!session) return

    // Only session creator can stop recording
    if (session.creator.toString() !== socket.userId) {
      socket.emit("error", { message: "Only session creator can stop recording" })
      return
    }

    // Update session status
    session.status = "completed"
    session.endTime = new Date()
    await session.save()

    // Notify all participants
    io.to(sessionId).emit("recording-stopped", {
      endTime: session.endTime,
      duration: session.duration,
      stoppedBy: socket.userName,
    })

    console.log(`⏹️ Recording stopped for session ${sessionId} by ${socket.userName}`)
  } catch (error) {
    console.error("Stop recording error:", error)
    socket.emit("error", { message: "Failed to stop recording" })
  }
}

/**
 * Handle chat messages
 */
const handleChatMessage = async (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  data: { sessionId: string; message: string },
): Promise<void> => {
  try {
    if (!socket.userId || !socket.userName) {
      socket.emit("error", { message: "Not authenticated" })
      return
    }

    const { sessionId, message } = data

    // Validate message
    if (!message.trim() || message.length > 1000) {
      socket.emit("error", { message: "Invalid message" })
      return
    }

    // Save message to database
    const session = await Session.findById(sessionId)
    if (session) {
      await session.addChatMessage({
        userId: socket.userId as any,
        senderName: socket.userName,
        message: message.trim(),
      })
    }

    // Broadcast message to all session participants
    const messageData = {
      id: Date.now().toString(),
      userId: socket.userId,
      senderName: socket.userName,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    }

    io.to(sessionId).emit("chat-message", messageData)

    console.log(`💬 Chat message in session ${sessionId} from ${socket.userName}: ${message}`)
  } catch (error) {
    console.error("Chat message error:", error)
    socket.emit("error", { message: "Failed to send message" })
  }
}

/**
 * Handle media toggle events
 */
const handleMediaToggle = (
  socket: AuthenticatedSocket,
  io: SocketIOServer,
  type: "audio" | "video",
  data: any,
): void => {
  const { sessionId } = data

  if (type === "audio") {
    socket.to(sessionId).emit("participant-audio-toggle", {
      userId: socket.userId,
      userName: socket.userName,
      isMuted: data.isMuted,
    })
  } else if (type === "video") {
    socket.to(sessionId).emit("participant-video-toggle", {
      userId: socket.userId,
      userName: socket.userName,
      isVideoOff: data.isVideoOff,
    })
  }
}

/**
 * Handle WebRTC signaling
 */
const handleWebRTCSignal = (socket: AuthenticatedSocket, io: SocketIOServer, type: string, data: any): void => {
  const { targetSocketId } = data

  socket.to(targetSocketId).emit(`webrtc-${type}`, {
    fromSocketId: socket.id,
    ...data,
  })
}
