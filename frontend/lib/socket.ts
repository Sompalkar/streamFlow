/**
 * Socket.IO Client
 * Handles real-time communication for recording sessions
 */

import { io, type Socket } from "socket.io-client"
import { useStudioStore, useAuthStore } from "./store"

class SocketManager {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): Socket | null {
    const token = useAuthStore.getState().token
    if (!token) {
      console.error("No auth token available for socket connection")
      return null
    }

    if (this.socket?.connected) {
      return this.socket
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    })

    this.setupEventListeners()
    useStudioStore.getState().setSocket(this.socket)

    return this.socket
  }

  private setupEventListeners() {
    if (!this.socket) return

    // Connection events
    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id)
      useStudioStore.getState().setIsConnected(true)
      this.reconnectAttempts = 0

      // Authenticate socket
      const token = useAuthStore.getState().token
      if (token) {
        this.socket?.emit("authenticate", { token })
      }
    })

    this.socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason)
      useStudioStore.getState().setIsConnected(false)

      if (reason === "io server disconnect") {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect()
      }
    })

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error)
      useStudioStore.getState().setIsConnected(false)
      this.handleReconnect()
    })

    // Authentication events
    this.socket.on("authenticated", (data) => {
      if (data.success) {
        console.log("✅ Socket authenticated for user:", data.userName)
      } else {
        console.error("❌ Socket authentication failed:", data.error)
        this.disconnect()
      }
    })

    // Session events
    this.socket.on("session-joined", (data) => {
      console.log("👥 Joined session:", data.sessionId)
      const { setParticipants, setMessages } = useStudioStore.getState()

      if (data.participants) {
        setParticipants(
          data.participants.map((p: any) => ({
            id: p.userId || p.socketId,
            name: p.userName,
            isHost: p.userId === data.session?.creator,
            isMuted: false,
            isVideoOn: true,
            isConnected: true,
            socketId: p.socketId,
          })),
        )
      }

      if (data.session?.chatMessages) {
        setMessages(
          data.session.chatMessages.map((msg: any) => ({
            id: msg._id || Date.now().toString(),
            sender: msg.userId || "system",
            senderName: msg.senderName,
            message: msg.message,
            timestamp: new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        )
      }
    })

    this.socket.on("participant-joined", (data) => {
      console.log("👤 Participant joined:", data.userName)
      const { addParticipant } = useStudioStore.getState()

      addParticipant({
        id: data.userId || data.socketId,
        name: data.userName,
        isHost: false,
        isMuted: false,
        isVideoOn: true,
        isConnected: true,
        socketId: data.socketId,
      })
    })

    this.socket.on("participant-left", (data) => {
      console.log("👋 Participant left:", data.userName)
      const { removeParticipant } = useStudioStore.getState()
      removeParticipant(data.userId || data.socketId)
    })

    // Recording events
    this.socket.on("recording-started", (data) => {
      console.log("🔴 Recording started by:", data.startedBy)
      const { setIsRecording, setSessionStatus } = useStudioStore.getState()
      setIsRecording(true)
      setSessionStatus("active")
    })

    this.socket.on("recording-stopped", (data) => {
      console.log("⏹️ Recording stopped by:", data.stoppedBy)
      const { setIsRecording, setRecordingTime, setSessionStatus } = useStudioStore.getState()
      setIsRecording(false)
      setRecordingTime(0)
      setSessionStatus("completed")
    })

    // Chat events
    this.socket.on("chat-message", (data) => {
      const { addMessage } = useStudioStore.getState()
      addMessage({
        id: data.id,
        sender: data.userId,
        senderName: data.senderName,
        message: data.message,
        timestamp: new Date(data.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    })

    // Media control events
    this.socket.on("participant-audio-toggle", (data) => {
      const { updateParticipant } = useStudioStore.getState()
      updateParticipant(data.userId, { isMuted: data.isMuted })
    })

    this.socket.on("participant-video-toggle", (data) => {
      const { updateParticipant } = useStudioStore.getState()
      updateParticipant(data.userId, { isVideoOn: !data.isVideoOff })
    })

    // WebRTC signaling events
    this.socket.on("webrtc-offer", (data) => {
      // Handle WebRTC offer
      console.log("📞 Received WebRTC offer from:", data.fromSocketId)
    })

    this.socket.on("webrtc-answer", (data) => {
      // Handle WebRTC answer
      console.log("📞 Received WebRTC answer from:", data.fromSocketId)
    })

    this.socket.on("webrtc-ice-candidate", (data) => {
      // Handle ICE candidate
      console.log("🧊 Received ICE candidate from:", data.fromSocketId)
    })

    // Error events
    this.socket.on("error", (error) => {
      console.error("❌ Socket error:", error)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

      setTimeout(() => {
        this.connect()
      }, Math.pow(2, this.reconnectAttempts) * 1000) // Exponential backoff
    } else {
      console.error("❌ Max reconnection attempts reached")
    }
  }

  // Session methods
  joinSession(sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit("join-session", { sessionId })
    }
  }

  leaveSession() {
    if (this.socket?.connected) {
      this.socket.emit("leave-session")
    }
  }

  startRecording(sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit("start-recording", { sessionId })
    }
  }

  stopRecording(sessionId: string) {
    if (this.socket?.connected) {
      this.socket.emit("stop-recording", { sessionId })
    }
  }

  // Chat methods
  sendMessage(sessionId: string, message: string) {
    if (this.socket?.connected) {
      this.socket.emit("chat-message", { sessionId, message })
    }
  }

  // Media control methods
  toggleAudio(sessionId: string, isMuted: boolean) {
    if (this.socket?.connected) {
      this.socket.emit("toggle-audio", { sessionId, isMuted })
    }
  }

  toggleVideo(sessionId: string, isVideoOff: boolean) {
    if (this.socket?.connected) {
      this.socket.emit("toggle-video", { sessionId, isVideoOff })
    }
  }

  // WebRTC signaling methods
  sendOffer(targetSocketId: string, offer: RTCSessionDescriptionInit) {
    if (this.socket?.connected) {
      this.socket.emit("webrtc-offer", { targetSocketId, offer })
    }
  }

  sendAnswer(targetSocketId: string, answer: RTCSessionDescriptionInit) {
    if (this.socket?.connected) {
      this.socket.emit("webrtc-answer", { targetSocketId, answer })
    }
  }

  sendIceCandidate(targetSocketId: string, candidate: RTCIceCandidateInit) {
    if (this.socket?.connected) {
      this.socket.emit("webrtc-ice-candidate", { targetSocketId, candidate })
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      useStudioStore.getState().setSocket(null)
      useStudioStore.getState().setIsConnected(false)
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }
}

export const socketManager = new SocketManager()
