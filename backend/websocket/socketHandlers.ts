/**
 * WebSocket Event Handlers
 * Handles real-time communication for recording sessions and chat
 */

import type { Socket, Server as SocketIOServer } from "socket.io"
import jwt from "jsonwebtoken"
import Session from "../models/Session"
import User from "../models/User"

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
 * Authenticate socket connection using JWT token
 */
const authenticateSocket = async (socket: AuthenticatedSocket, token: string): Promise<boolean> => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as { userId: string }
    const user = await User.findById(decoded.userId)

    if (!user) {
      return false
    }

    socket.userId = user._id
    socket.userName = user.name
    socketToUser.set(socket.id, { userId: user._id, userName: user.name })

    return true
  } catch (error) {
    console.error("Socket authentication error:", error)
    return false
  }
}

/**
 * Handle socket connection and all events
 */
export const handleSocketConnection = (socket: AuthenticatedSocket, io: SocketIOServer) => {
  /**
   * Authentication event
   * Client must authenticate before joining sessions
   */
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

  /**
   * Join recording session
   */
  socket.on("join-session", async (data: { sessionId: string }) => {
    try {
      if (!socket.userId) {
        socket.emit("error", { message: "Not authenticated" })
        return
      }

      const { sessionId } = data

      // Verify session exists and user has access
      const session = await Session.findById(sessionId)
      if (!session) {
        socket.emit("error", { message: "Session not found" })
        return
      }

      // Check if user is a participant or creator
      const isParticipant = session.participants.some(
        (p) => p.userId?.toString() === socket.userId || session.creator.toString() === socket.userId,
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
  })

  /**
   * Leave recording session
   */
  socket.on("leave-session", async () => {
    await handleLeaveSession(socket, io)
  })

  /**
   * WebRTC signaling events
   */
  socket.on("webrtc-offer", (data: { targetSocketId: string; offer: any }) => {
    socket.to(data.targetSocketId).emit("webrtc-offer", {
      fromSocketId: socket.id,
      offer: data.offer,
    })
  })

  socket.on("webrtc-answer", (data: { targetSocketId: string; answer: any }) => {
    socket.to(data.targetSocketId).emit("webrtc-answer", {
      fromSocketId: socket.id,
      answer: data.answer,
    })
  })

  socket.on("webrtc-ice-candidate", (data: { targetSocketId: string; candidate: any }) => {
    socket.to(data.targetSocketId).emit("webrtc-ice-candidate", {
      fromSocketId: socket.id,
      candidate: data.candidate,
    })
  })

  /**
   * Recording control events
   */
  socket.on("start-recording", async (data: { sessionId: string }) => {
    try {
      const session = await Session.findById(data.sessionId)
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
      io.to(data.sessionId).emit("recording-started", {
        startTime: session.startTime,
        startedBy: socket.userName,
      })

      console.log(`🔴 Recording started for session ${data.sessionId} by ${socket.userName}`)
    } catch (error) {
      console.error("Start recording error:", error)
      socket.emit("error", { message: "Failed to start recording" })
    }
  })

  socket.on("stop-recording", async (data: { sessionId: string }) => {
    try {
      const session = await Session.findById(data.sessionId)
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
      io.to(data.sessionId).emit("recording-stopped", {
        endTime: session.endTime,
        duration: session.duration,
        stoppedBy: socket.userName,
      })

      console.log(`⏹️ Recording stopped for session ${data.sessionId} by ${socket.userName}`)
    } catch (error) {
      console.error("Stop recording error:", error)
      socket.emit("error", { message: "Failed to stop recording" })
    }
  })

  /**
   * Chat message events
   */
  socket.on("chat-message", async (data: { sessionId: string; message: string }) => {
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
          userId: socket.userId,
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
  })

  /**
   * Media control events
   */
  socket.on("toggle-audio", (data: { sessionId: string; isMuted: boolean }) => {
    socket.to(data.sessionId).emit("participant-audio-toggle", {
      userId: socket.userId,
      userName: socket.userName,
      isMuted: data.isMuted,
    })
  })

  socket.on("toggle-video", (data: { sessionId: string; isVideoOff: boolean }) => {
    socket.to(data.sessionId).emit("participant-video-toggle", {
      userId: socket.userId,
      userName: socket.userName,
      isVideoOff: data.isVideoOff,
    })
  })

  /**
   * Handle socket disconnection
   */
  socket.on("disconnect", async (reason) => {
    console.log(`🔌 Socket disconnected: ${socket.id}, Reason: ${reason}`)
    await handleLeaveSession(socket, io)
  })
}

/**
 * Handle leaving session (used by both leave-session event and disconnect)
 */
const handleLeaveSession = async (socket: AuthenticatedSocket, io: SocketIOServer) => {
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
