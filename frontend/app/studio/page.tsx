"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageCircle,
  Settings,
  Upload,
  Play,
  Square,
  Volume2,
  VolumeX,
  Monitor,
  MonitorOff,
  Send,
} from "lucide-react"
import { useStudioStore, useAuthStore } from "@/lib/store"
import { io, type Socket } from "socket.io-client"

export default function StudioPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session")

  // Store state
  const {
    isRecording,
    recordingTime,
    isMuted,
    isVideoOn,
    isSpeakerOn,
    isScreenSharing,
    participants,
    messages,
    showChat,
    showParticipants,
    isConnected,
    recordingBlob,
    setSessionId,
    setIsRecording,
    setRecordingTime,
    setIsMuted,
    setIsVideoOn,
    setIsSpeakerOn,
    setIsScreenSharing,
    setShowChat,
    setShowParticipants,
    addMessage,
    setIsConnected,
    setRecordingBlob,
    resetStudio,
  } = useStudioStore()

  const { user, token, isAuthenticated } = useAuthStore()

  // Local state
  const [session, setSession] = useState<any>(null)
  const [isHost, setIsHost] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize studio
  useEffect(() => {
    // if (!isAuthenticated) {
    //   router.push("/auth/login")
    //   return
    // }

    // if (!sessionId) {
    //   router.push("/dashboard")
    //   return
    // }

    initializeStudio()

    return () => {
      cleanup()
    }
  }, [sessionId, isAuthenticated])

  // Initialize studio and join session
  const initializeStudio = async () => {
    try {
      setIsJoining(true)
      setSessionId(sessionId)

      // Get session details
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions/${sessionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        setSession(data.data.session)
        setIsHost(data.data.session.creator._id === user?.id)
      }

      // Initialize media
      await initializeMedia()

      // Connect to WebSocket
      await connectSocket()
    } catch (error) {
      console.error("Failed to initialize studio:", error)
    } finally {
      setIsJoining(false)
    }
  }

  // Initialize media devices
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      console.log("✅ Media initialized successfully")
    } catch (error) {
      console.error("Failed to initialize media:", error)
    }
  }

  // Connect to WebSocket
  const connectSocket = async () => {
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000"
      const newSocket = io(socketUrl, {
        auth: {
          token: token,
        },
      })

      newSocket.on("connect", () => {
        console.log("✅ Socket connected")
        setIsConnected(true)

        // Join session
        newSocket.emit("join-session", { sessionId, userId: user?.id, userName: user?.name })
      })

      newSocket.on("disconnect", () => {
        console.log("❌ Socket disconnected")
        setIsConnected(false)
      })

      newSocket.on("session-joined", (data) => {
        console.log("Joined session:", data)
      })

      newSocket.on("participant-joined", (data) => {
        console.log("Participant joined:", data.userName)
        addMessage({
          id: Date.now().toString(),
          sender: "system",
          senderName: "System",
          message: `${data.userName} joined the session`,
          timestamp: new Date().toLocaleTimeString(),
        })
      })

      newSocket.on("participant-left", (data) => {
        console.log("Participant left:", data.userName)
        addMessage({
          id: Date.now().toString(),
          sender: "system",
          senderName: "System",
          message: `${data.userName} left the session`,
          timestamp: new Date().toLocaleTimeString(),
        })
      })

      newSocket.on("recording-started", (data) => {
        console.log("Recording started by:", data.startedBy)
        setIsRecording(true)
        startRecordingTimer()
        startLocalRecording()
      })

      newSocket.on("recording-stopped", (data) => {
        console.log("Recording stopped by:", data.stoppedBy)
        setIsRecording(false)
        stopRecordingTimer()
        stopLocalRecording()
      })

      newSocket.on("chat-message", (data) => {
        addMessage({
          id: data.id,
          sender: data.userId,
          senderName: data.senderName,
          message: data.message,
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
        })
      })

      setSocket(newSocket)
    } catch (error) {
      console.error("Failed to connect socket:", error)
    }
  }

  // Start recording timer
  const startRecordingTimer = () => {
    setRecordingTime(0)
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1)
    }, 1000)
  }

  // Stop recording timer
  const stopRecordingTimer = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  // Start local recording
  const startLocalRecording = () => {
    if (!localStream) return

    try {
      recordingChunksRef.current = []

      const mediaRecorder = new MediaRecorder(localStream, {
        mimeType: "video/webm;codecs=vp9,opus",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: "video/webm" })
        setRecordingBlob(blob)
        console.log("Recording blob created:", blob.size, "bytes")
      }

      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder

      console.log("✅ Local recording started")
    } catch (error) {
      console.error("Failed to start local recording:", error)
    }
  }

  // Stop local recording
  const stopLocalRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      console.log("⏹️ Local recording stopped")
    }
  }

  // Upload recording to server
  const uploadRecording = async () => {
    if (!recordingBlob || !sessionId) return

    try {
      setIsUploading(true)

      const formData = new FormData()
      formData.append("recording", recordingBlob, `recording-${Date.now()}.webm`)
      formData.append("sessionId", sessionId)
      formData.append("enableTranscription", "true")

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/upload/recording`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      )

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Recording uploaded successfully:", data)

        addMessage({
          id: Date.now().toString(),
          sender: "system",
          senderName: "System",
          message: "Your recording has been uploaded and is being processed",
          timestamp: new Date().toLocaleTimeString(),
        })

        setRecordingBlob(null)
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Failed to upload recording:", error)
      addMessage({
        id: Date.now().toString(),
        sender: "system",
        senderName: "System",
        message: "Failed to upload recording. Please try again.",
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle recording controls
  const handleStartRecording = async () => {
    if (isHost && sessionId) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions/${sessionId}/start-recording`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (response.ok) {
          socket?.emit("start-recording", { sessionId, startedBy: user?.name })
        }
      } catch (error) {
        console.error("Failed to start recording:", error)
      }
    }
  }

  const handleStopRecording = async () => {
    if (isHost && sessionId) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions/${sessionId}/stop-recording`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (response.ok) {
          socket?.emit("stop-recording", { sessionId, stoppedBy: user?.name })
        }
      } catch (error) {
        console.error("Failed to stop recording:", error)
      }
    }
  }

  // Handle media controls
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)

        socket?.emit("toggle-audio", { sessionId, isMuted: !audioTrack.enabled })
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOn(videoTrack.enabled)

        socket?.emit("toggle-video", { sessionId, isVideoOn: videoTrack.enabled })
      }
    }
  }

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn)
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream
        }

        setIsScreenSharing(true)

        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          initializeMedia()
        }
      } else {
        setIsScreenSharing(false)
        await initializeMedia()
      }
    } catch (error) {
      console.error("Screen share error:", error)
    }
  }

  // Handle chat
  const sendChatMessage = () => {
    if (chatMessage.trim() && sessionId && socket) {
      socket.emit("send-message", {
        sessionId,
        message: chatMessage.trim(),
        senderName: user?.name,
        userId: user?.id,
      })
      setChatMessage("")
    }
  }

  // Handle leaving session
  const leaveSession = () => {
    cleanup()
    router.push("/dashboard")
  }

  // Cleanup function
  const cleanup = () => {
    if (isRecording) {
      stopLocalRecording()
      stopRecordingTimer()
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    if (socket) {
      socket.disconnect()
    }

    resetStudio()
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (isJoining) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-primary-foreground animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Joining Session...</h2>
          <p className="text-muted-foreground">Setting up your recording studio</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">{session?.title || "Recording Session"}</h1>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                  {isRecording && (
                    <Badge className="bg-red-100 text-red-800 animate-pulse">REC {formatTime(recordingTime)}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowParticipants(!showParticipants)}>
              <Users className="w-4 h-4 mr-2" />
              {participants.length}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="destructive" size="sm" onClick={leaveSession}>
              <PhoneOff className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Video Grid */}
          <div className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
              {/* Local Video */}
              <Card className="relative overflow-hidden bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }} // Mirror effect
                />
                <div className="absolute bottom-4 left-4 flex items-center space-x-2">
                  <Badge className="bg-black/50 text-white">You</Badge>
                  {!isVideoOn && (
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <VideoOff className="w-4 h-4" />
                    </div>
                  )}
                  {isMuted && (
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <MicOff className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                {isScreenSharing && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-blue-500 text-white">
                      <Monitor className="w-3 h-3 mr-1" />
                      Screen Sharing
                    </Badge>
                  </div>
                )}
              </Card>

              {/* Participant Videos */}
              {participants.map((participant) => (
                <Card key={participant.id} className="relative overflow-hidden bg-muted">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-semibold text-primary">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-black/50 text-white">{participant.name}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="bg-card/50 backdrop-blur-xl border-t border-border/50 p-6">
            <div className="flex items-center justify-center space-x-4">
              {/* Audio Control */}
              <Button
                variant={isMuted ? "destructive" : "outline"}
                size="lg"
                onClick={toggleAudio}
                className="w-12 h-12 rounded-full p-0"
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              {/* Video Control */}
              <Button
                variant={!isVideoOn ? "destructive" : "outline"}
                size="lg"
                onClick={toggleVideo}
                className="w-12 h-12 rounded-full p-0"
              >
                {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              {/* Screen Share */}
              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="lg"
                onClick={toggleScreenShare}
                className="w-12 h-12 rounded-full p-0"
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>

              {/* Recording Control (Host Only) */}
              {isHost && (
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="lg"
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className="px-6"
                >
                  {isRecording ? (
                    <>
                      <Square className="w-5 h-5 mr-2" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Recording
                    </>
                  )}
                </Button>
              )}

              {/* Upload Recording */}
              {recordingBlob && (
                <Button variant="outline" size="lg" onClick={uploadRecording} disabled={isUploading} className="px-6">
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Recording
                    </>
                  )}
                </Button>
              )}

              {/* Speaker Control */}
              <Button
                variant={!isSpeakerOn ? "destructive" : "outline"}
                size="lg"
                onClick={toggleSpeaker}
                className="w-12 h-12 rounded-full p-0"
              >
                {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-card/50 backdrop-blur-xl border-l border-border/50 flex flex-col">
            <div className="p-4 border-b border-border/50">
              <h3 className="font-semibold">Chat</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                    <span className="font-medium">{message.senderName}</span>
                    <span>{message.timestamp}</span>
                  </div>
                  <p className="text-sm">{message.message}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/50">
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => e.key === "Enter" && sendChatMessage()}
                  className="flex-1"
                />
                <Button size="sm" onClick={sendChatMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
