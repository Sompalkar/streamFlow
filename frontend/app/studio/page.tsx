"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Settings,
  Users,
  MessageCircle,
  Send,
  Square,
  Volume2,
  VolumeX,
  Monitor,
  Maximize,
  Share2,
  Play,
  StopCircle,
  UserPlus,
  Shield,
  Clock,
  Minimize,
  CameraOff,
  Loader2,
  AlertCircle,
  X,
  Copy,
  Trash2,
  Settings2,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTheme } from "next-themes"
import { useStudioStore, useAuthStore, useSessionStore } from "@/lib/store"
import { apiClient } from "@/lib/api"
import { socketManager } from "@/lib/socket"

export default function StudioPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session")
  const { theme } = useTheme()

  // Store state
  const {
    sessionStatus,
    isHost,
    isRecording,
    recordingTime,
    recordingStatus,
    localStream,
    isMuted,
    isVideoOn,
    isSpeakerOn,
    isScreenSharing,
    participants,
    messages,
    unreadCount,
    showChat,
    showParticipants,
    showSettings,
    isFullscreen,
    isConnected,
    setSessionId,
    setSessionStatus,
    setIsHost,
    setIsRecording,
    setRecordingTime,
    setRecordingStatus,
    setLocalStream,
    setIsMuted,
    setIsVideoOn,
    setIsSpeakerOn,
    setIsScreenSharing,
    setShowChat,
    setShowParticipants,
    setShowSettings,
    setIsFullscreen,
    resetStudio,
  } = useStudioStore() 

  const { user } = useAuthStore()
  const { currentSession, setCurrentSession } = useSessionStore()

  // Local state
  const [chatMessage, setChatMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [showRecordingSettings, setShowRecordingSettings] = useState(false)
  const [recordingSettings, setRecordingSettings] = useState({
    quality: "high" as "low" | "medium" | "high" | "4k",
    enableTranscription: false,
    recordAudio: true,
    recordVideo: true,
  })

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout>()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Initialize session
  useEffect(() => {
    if (sessionId && user) {
      initializeSession(sessionId)
    }

    return () => {
      cleanup()
    }
  }, [sessionId, user])

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [isRecording])

  // Socket connection effect
  useEffect(() => {
    if (sessionId && user) {
      const socket = socketManager.connect()
      if (socket) {
        setConnectionStatus("connected")
        socketManager.joinSession(sessionId)
      }
    }

    return () => {
      socketManager.leaveSession()
    }
  }, [sessionId, user])

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  // Initialize session
  const initializeSession = async (sessionId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // Load session data
      const response = await apiClient.getSession(sessionId)
      if (response.success && response.data) {
        const session = response.data.session
        setCurrentSession(session)
        setSessionId(sessionId)
        setSessionStatus(session.status)
        setIsHost(session.creator === user?._id)

        // Set recording settings from session
        setRecordingSettings({
          quality: "high",
          enableTranscription: session.settings.autoTranscribe || false,
          recordAudio: session.settings.recordAudio || true,
          recordVideo: session.settings.recordVideo || true,
        })

        // Join session if not already a participant
        const isParticipant = session.participants.some((p: any) => p.userId === user?._id)

        if (!isParticipant) {
          await apiClient.joinSession(sessionId, user?.name)
        }

        // Initialize media
        await initializeMedia()
      } else {
        setError(response.error || "Failed to load session")
      }
    } catch (error) {
      console.error("Failed to initialize session:", error)
      setError("Failed to initialize session")
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize media streams
  const initializeMedia = async () => {
    try {
      const constraints = {
        video: recordingSettings.recordVideo
          ? {
              width: { ideal: recordingSettings.quality === "4k" ? 3840 : 1280 },
              height: { ideal: recordingSettings.quality === "4k" ? 2160 : 720 },
              frameRate: { ideal: 30 },
            }
          : false,
        audio: recordingSettings.recordAudio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
            }
          : false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Set initial audio state
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !isMuted
      }

      // Set initial video state
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = isVideoOn
      }
    } catch (error) {
      console.error("Error accessing media devices:", error)
      setError("Failed to access camera and microphone. Please check permissions.")
    }
  }

  // Start recording
  const startRecording = async () => {
    if (!sessionId || !isHost || !localStream) return

    setRecordingStatus("starting")
    try {
      // Start session recording via API
      const response = await apiClient.startSession(sessionId)
      if (response.success) {
        // Determine MIME type based on quality
        const mimeTypes = {
          low: "video/webm;codecs=vp8,opus",
          medium: "video/webm;codecs=vp9,opus",
          high: "video/webm;codecs=vp9,opus",
          "4k": "video/webm;codecs=vp9,opus",
        }

        const mimeType = mimeTypes[recordingSettings.quality]
        const mediaRecorder = new MediaRecorder(localStream, {
          mimeType,
          videoBitsPerSecond: recordingSettings.quality === "4k" ? 8000000 : 2000000,
          audioBitsPerSecond: 128000,
        })

        recordedChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, {
            type: mimeType,
          })

          // Upload recording
          await uploadRecording(blob)
        }

        mediaRecorder.start(1000) // Collect data every second
        mediaRecorderRef.current = mediaRecorder

        setIsRecording(true)
        setRecordingStatus("recording")
        socketManager.startRecording(sessionId)
      } else {
        setError(response.error || "Failed to start recording")
      }
    } catch (error) {
      console.error("Failed to start recording:", error)
      setError("Failed to start recording")
    } finally {
      setRecordingStatus("idle")
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (!sessionId || !isHost) return

    setRecordingStatus("stopping")
    try {
      // Stop local recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }

      // Stop session recording via API
      const response = await apiClient.stopSession(sessionId)
      if (response.success) {
        setIsRecording(false)
        setRecordingTime(0)
        socketManager.stopRecording(sessionId)
      } else {
        setError(response.error || "Failed to stop recording")
      }
    } catch (error) {
      console.error("Failed to stop recording:", error)
      setError("Failed to stop recording")
    } finally {
      setRecordingStatus("idle")
    }
  }

  // Upload recording
  const uploadRecording = async (blob: Blob) => {
    if (!sessionId || !user) return

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const extension = recordingSettings.quality === "4k" ? "webm" : "webm"
      const file = new File([blob], `recording-${user.name}-${timestamp}.${extension}`, {
        type: blob.type,
      })

      const response = await apiClient.uploadRecording(file, sessionId, user._id, recordingSettings.enableTranscription)

      if (!response.success) {
        console.error("Failed to upload recording:", response.error)
        setError("Failed to upload recording")
      } else {
        console.log("Recording uploaded successfully")
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError("Failed to upload recording")
    }
  }

  // Toggle microphone
  const toggleMicrophone = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setIsMuted(!isMuted)
        socketManager.toggleAudio(sessionId!, !isMuted)
      }
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn
        setIsVideoOn(!isVideoOn)
        socketManager.toggleVideo(sessionId!, isVideoOn)
      }
    }
  }

  // Toggle screen sharing
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        })

        // Replace video track
        if (localStream && localVideoRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0]
          const sender = localStream.getVideoTracks()[0]

          // Replace track in local stream
          localStream.removeTrack(sender)
          localStream.addTrack(videoTrack)

          localVideoRef.current.srcObject = localStream
        }

        setIsScreenSharing(true)

        // Handle screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          initializeMedia() // Return to camera
        }
      } else {
        setIsScreenSharing(false)
        await initializeMedia() // Return to camera
      }
    } catch (error) {
      console.error("Screen sharing error:", error)
      setError("Failed to share screen")
    }
  }

  // Send chat message
  const sendMessage = () => {
    if (chatMessage.trim() && sessionId) {
      socketManager.sendMessage(sessionId, chatMessage.trim())
      setChatMessage("")
    }
  }

  // Handle key press in chat input
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Copy session link
  const copySessionLink = () => {
    const link = `${window.location.origin}/studio?session=${sessionId}`
    navigator.clipboard.writeText(link)
    // TODO: Show toast notification
  }

  // Invite participant
  const inviteParticipant = async () => {
    if (!inviteEmail.trim() || !sessionId) return

    try {
      // TODO: Implement invite API endpoint
      const inviteLink = `${window.location.origin}/studio?session=${sessionId}&invite=${encodeURIComponent(inviteEmail)}`

      // For now, just copy the link
      navigator.clipboard.writeText(inviteLink)
      setInviteEmail("")
      setShowInviteModal(false)

      // TODO: Send email invitation
    } catch (error) {
      console.error("Failed to invite participant:", error)
    }
  }

  // Leave session
  const leaveSession = async () => {
    try {
      if (sessionId) {
        await apiClient.leaveSession(sessionId)
        socketManager.leaveSession()
      }
      cleanup()
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to leave session:", error)
      // Still navigate away
      cleanup()
      router.push("/dashboard")
    }
  }

  // End session (host only)
  const endSession = async () => {
    if (!isHost || !sessionId) return

    try {
      if (isRecording) {
        await stopRecording()
      }

      await apiClient.deleteSession(sessionId)
      cleanup()
      router.push("/dashboard")
    } catch (error) {
      console.error("Failed to end session:", error)
      setError("Failed to end session")
    }
  }

  // Cleanup function
  const cleanup = () => {
    // Stop recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
    }

    // Clear intervals
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current)
    }

    // Reset studio state
    resetStudio()

    // Disconnect socket
    socketManager.disconnect()
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Get recording button color based on status
  const getRecordingButtonColor = () => {
    switch (recordingStatus) {
      case "starting":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "recording":
        return "bg-red-500 hover:bg-red-600 animate-pulse"
      case "stopping":
        return "bg-orange-500 hover:bg-orange-600"
      default:
        return "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
    }
  }

  // Get theme-aware colors
  const getThemeColors = () => {
    const isDark = theme === "dark"
    return {
      background: isDark ? "from-slate-900 via-slate-800 to-slate-900" : "from-slate-50 via-white to-slate-100",
      cardBg: isDark ? "bg-slate-800/50" : "bg-white/80",
      border: isDark ? "border-slate-700/50" : "border-slate-200/50",
      text: isDark ? "text-white" : "text-slate-900",
      textMuted: isDark ? "text-slate-400" : "text-slate-600",
      accent: isDark ? "bg-slate-700/50" : "bg-slate-100/50",
      hover: isDark ? "hover:bg-slate-700/50" : "hover:bg-slate-100/50",
    }
  }

  const colors = getThemeColors()

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${colors.background} flex items-center justify-center`}>
        <Card className={`p-8 ${colors.cardBg} backdrop-blur-xl ${colors.border}`}>
          <div className="flex items-center space-x-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div>
              <h3 className={`text-lg font-semibold ${colors.text}`}>Joining Session</h3>
              <p className={colors.textMuted}>Setting up your recording studio...</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${colors.background} flex items-center justify-center`}>
        <Card className={`p-8 ${colors.cardBg} backdrop-blur-xl ${colors.border} max-w-md`}>
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>Session Error</h3>
            <p className={`${colors.textMuted} mb-4`}>{error}</p>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => router.push("/dashboard")} className="flex-1">
                Back to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} className="flex-1">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${colors.background} flex flex-col`}>
      {/* Enhanced Header */}
      <div className={`${colors.cardBg} backdrop-blur-xl ${colors.border} border-b px-6 py-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className={`${colors.textMuted} ${colors.hover} transition-colors`}>
              ← Back to Dashboard
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded flex items-center justify-center">
                <Mic className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className={`${colors.text} font-medium`}>{currentSession?.title || "Recording Studio"}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <Badge
              className={`px-3 py-1 ${
                isConnected
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
              />
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>

            {/* Session Status */}
            <Badge
              className={`px-3 py-1 ${
                sessionStatus === "active"
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : sessionStatus === "completed"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-slate-500/20 text-slate-400 border-slate-500/30"
              }`}
            >
              {sessionStatus === "active" && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />}
              {sessionStatus.charAt(0).toUpperCase() + sessionStatus.slice(1)}
            </Badge>

            {/* Recording indicator */}
            {isRecording && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2" />
                REC {formatTime(recordingTime)}
              </Badge>
            )}

            {/* Participants count */}
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              <Users className="w-3 h-3 mr-1" />
              {participants.filter((p) => p.isConnected).length}/{participants.length}
            </Badge>

            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(!showParticipants)}
                className={`${colors.textMuted} ${colors.hover}`}
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className={`${colors.textMuted} ${colors.hover}`}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySessionLink}
                className={`${colors.textMuted} ${colors.hover}`}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Video Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Local Video (You) */}
            <Card className={`${colors.cardBg} backdrop-blur-sm ${colors.border} overflow-hidden relative group`}>
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }} // Mirror effect
              />

              {/* Video overlay controls */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRecordingSettings(true)}
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
                  >
                    <Settings2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* User info */}
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>You</span>
                {isHost && <Shield className="w-3 h-3 text-yellow-400" />}
                {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                {!isVideoOn && <CameraOff className="w-3 h-3 text-red-400" />}
                {isScreenSharing && <Monitor className="w-3 h-3 text-blue-400" />}
              </div>

              {/* Connection status */}
              <div className="absolute top-4 left-4">
                <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              </div>

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 right-4">
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
                    REC
                  </div>
                </div>
              )}

              {!isVideoOn && (
                <div className="absolute inset-0 bg-slate-700/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-medium">
                      {user?.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Remote Participants */}
            {participants.slice(0, 3).map((participant, index) => (
              <Card
                key={participant.id}
                className={`${colors.cardBg} backdrop-blur-sm ${colors.border} overflow-hidden relative group`}
              >
                <div className={`w-full h-full bg-gradient-to-br ${colors.accent} flex items-center justify-center`}>
                  {participant.isVideoOn ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className={`${colors.text} text-lg`}>📹 {participant.name}</span>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-medium">
                        {participant.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Participant info */}
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                  <span>{participant.name}</span>
                  {participant.isHost && <Shield className="w-3 h-3 text-yellow-400" />}
                  {participant.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                  {!participant.isVideoOn && <CameraOff className="w-3 h-3 text-red-400" />}
                </div>

                {/* Connection status */}
                <div className="absolute top-4 left-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      participant.isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
                    }`}
                  />
                </div>

                {/* Video controls */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
                  >
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {/* Empty slot for more participants */}
            {participants.length < 4 && (
              <Card
                className={`${colors.accent} backdrop-blur-sm ${colors.border} border-dashed flex items-center justify-center group ${colors.hover} transition-colors cursor-pointer`}
                onClick={() => setShowInviteModal(true)}
              >
                <div className={`text-center ${colors.textMuted} group-hover:${colors.text} transition-colors`}>
                  <UserPlus className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Invite participant</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className={`w-80 ${colors.cardBg} backdrop-blur-xl ${colors.border} border-l flex flex-col`}>
            <div className={`p-4 ${colors.border} border-b`}>
              <div className="flex items-center justify-between">
                <h3 className={`${colors.text} font-medium flex items-center`}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                  {unreadCount > 0 && <Badge className="ml-2 bg-red-500 text-white text-xs">{unreadCount}</Badge>}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className={`${colors.textMuted} ${colors.hover} h-8 w-8 p-0`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${colors.text}`}>{message.senderName}</span>
                    <span className={`text-xs ${colors.textMuted} flex items-center`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {message.timestamp}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${colors.text} ${colors.accent} backdrop-blur-sm rounded-lg p-3 ${colors.border} border`}
                  >
                    {message.message}
                  </p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className={`text-center ${colors.textMuted} py-8`}>
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start the conversation!</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className={`p-4 ${colors.border} border-t`}>
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleChatKeyPress}
                  placeholder="Type a message..."
                  className={`${colors.accent} ${colors.border} ${colors.text} placeholder-${colors.textMuted} focus:border-primary`}
                />
                <Button onClick={sendMessage} size="sm" className="bg-primary hover:bg-primary/80 px-3">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Controls Bar */}
      <div className={`${colors.cardBg} backdrop-blur-xl ${colors.border} border-t px-6 py-4`}>
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center space-x-4">
            <div className={`${colors.textMuted} text-sm`}>{currentSession?.title || "Recording Session"}</div>
            {sessionStatus === "active" && (
              <div className={`${colors.textMuted} text-sm flex items-center`}>
                <Clock className="w-4 h-4 mr-1" />
                {formatTime(recordingTime)}
              </div>
            )}
          </div>

          {/* Center controls */}
          <div className="flex items-center space-x-4">
            {/* Microphone Control */}
            <Button
              onClick={toggleMicrophone}
              size="lg"
              variant={isMuted ? "destructive" : "secondary"}
              className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Video Control */}
            <Button
              onClick={toggleVideo}
              size="lg"
              variant={!isVideoOn ? "destructive" : "secondary"}
              className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </Button>

            {/* Recording Control */}
            {isHost && (
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                size="lg"
                disabled={recordingStatus !== "idle"}
                className={`rounded-full w-16 h-12 px-6 shadow-lg hover:shadow-xl transition-all duration-300 ${getRecordingButtonColor()}`}
              >
                {recordingStatus === "starting" && <Play className="w-5 h-5 animate-pulse" />}
                {recordingStatus === "recording" && <Square className="w-5 h-5" />}
                {recordingStatus === "stopping" && <StopCircle className="w-5 h-5 animate-pulse" />}
                {recordingStatus === "idle" &&
                  (isRecording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />)}
              </Button>
            )}

            {/* Speaker Control */}
            <Button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              size="lg"
              variant={!isSpeakerOn ? "destructive" : "secondary"}
              className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>

            {/* Screen Share */}
            <Button
              onClick={toggleScreenShare}
              size="lg"
              variant={isScreenSharing ? "default" : "secondary"}
              className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Monitor className="w-5 h-5" />
            </Button>

            {/* Chat Toggle */}
            <Button
              onClick={() => setShowChat(!showChat)}
              size="lg"
              variant={showChat ? "default" : "secondary"}
              className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300 relative"
            >
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full p-0 flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Right controls */}
          <div className="flex items-center space-x-4">
            {/* Invite Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInviteModal(true)}
              className={`${colors.border} ${colors.hover}`}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>

            {/* End Session (Host only) */}
            {isHost && (
              <Button size="sm" variant="destructive" onClick={endSession} className="bg-red-600 hover:bg-red-700">
                <Trash2 className="w-4 h-4 mr-2" />
                End Session
              </Button>
            )}

            {/* Leave Call */}
            <Button
              size="lg"
              variant="destructive"
              className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
              onClick={leaveSession}
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className={`w-full max-w-md mx-4 p-6 ${colors.cardBg} ${colors.border}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${colors.text}`}>Invite Participant</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInviteModal(false)}
                className={`${colors.textMuted} ${colors.hover} h-8 w-8 p-0`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${colors.text}`}>Email Address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className={`w-full ${colors.accent} ${colors.border}`}
                />
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowInviteModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={inviteParticipant}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  disabled={!inviteEmail.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
              <div className="pt-4 border-t border-border">
                <p className={`text-sm ${colors.textMuted} mb-2`}>Or share session link:</p>
                <div className="flex space-x-2">
                  <Input
                    value={`${window.location.origin}/studio?session=${sessionId}`}
                    readOnly
                    className={`flex-1 ${colors.accent} ${colors.border} text-sm`}
                  />
                  <Button size="sm" onClick={copySessionLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recording Settings Modal */}
      {showRecordingSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className={`w-full max-w-md mx-4 p-6 ${colors.cardBg} ${colors.border}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${colors.text}`}>Recording Settings</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRecordingSettings(false)}
                className={`${colors.textMuted} ${colors.hover} h-8 w-8 p-0`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`text-sm font-medium mb-2 block ${colors.text}`}>Quality</label>
                <select
                  value={recordingSettings.quality}
                  onChange={(e) =>
                    setRecordingSettings((prev) => ({
                      ...prev,
                      quality: e.target.value as "low" | "medium" | "high" | "4k",
                    }))
                  }
                  className={`w-full px-3 py-2 ${colors.accent} ${colors.border} border rounded-md ${colors.text}`}
                >
                  <option value="low">Low (480p)</option>
                  <option value="medium">Medium (720p)</option>
                  <option value="high">High (1080p)</option>
                  <option value="4k">4K (2160p)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${colors.text}`}>Enable Transcription</label>
                <input
                  type="checkbox"
                  checked={recordingSettings.enableTranscription}
                  onChange={(e) =>
                    setRecordingSettings((prev) => ({
                      ...prev,
                      enableTranscription: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${colors.text}`}>Record Audio</label>
                <input
                  type="checkbox"
                  checked={recordingSettings.recordAudio}
                  onChange={(e) =>
                    setRecordingSettings((prev) => ({
                      ...prev,
                      recordAudio: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className={`text-sm font-medium ${colors.text}`}>Record Video</label>
                <input
                  type="checkbox"
                  checked={recordingSettings.recordVideo}
                  onChange={(e) =>
                    setRecordingSettings((prev) => ({
                      ...prev,
                      recordVideo: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button variant="outline" onClick={() => setShowRecordingSettings(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowRecordingSettings(false)
                    // Reinitialize media with new settings
                    initializeMedia()
                  }}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                >
                  Apply Settings
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
