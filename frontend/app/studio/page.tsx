"use client"

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
  RepeatIcon as Record,
  Square,
  Volume2,
  VolumeX,
  Monitor,
  Maximize,
} from "lucide-react"
import Link from "next/link"

// Mock participants data
const mockParticipants = [
  { id: "1", name: "John Doe", isHost: true, isMuted: false, isVideoOn: true },
  { id: "2", name: "Jane Smith", isHost: false, isMuted: true, isVideoOn: true },
  { id: "3", name: "Mike Johnson", isHost: false, isMuted: false, isVideoOn: false },
]

// Mock chat messages
const mockMessages = [
  { id: "1", sender: "Jane Smith", message: "Hey everyone! Ready to start?", timestamp: "10:30 AM" },
  { id: "2", sender: "Mike Johnson", message: "Yes, all set on my end", timestamp: "10:31 AM" },
  { id: "3", sender: "John Doe", message: "Great! Let me start the recording", timestamp: "10:32 AM" },
]

export default function StudioPage() {
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  // Media controls state
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)

  // UI state
  const [showChat, setShowChat] = useState(true)
  const [chatMessage, setChatMessage] = useState("")
  const [participants, setParticipants] = useState(mockParticipants)
  const [messages, setMessages] = useState(mockMessages)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Refs for media elements
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout>()

  // Initialize media stream on component mount
  useEffect(() => {
    initializeMedia()
    return () => {
      // Cleanup media streams on unmount
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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

  // Initialize user media (camera and microphone)
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Error accessing media devices:", error)
    }
  }

  // Toggle recording state
  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      setRecordingTime(0)
      console.log("Recording stopped")
    } else {
      // Start recording
      setIsRecording(true)
      console.log("Recording started")
    }
  }

  // Toggle microphone
  const toggleMicrophone = () => {
    setIsMuted(!isMuted)
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
      }
    }
  }

  // Toggle video
  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn)
    if (localVideoRef.current?.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn
      }
    }
  }

  // Send chat message
  const sendMessage = () => {
    if (chatMessage.trim()) {
      const newMessage = {
        id: Date.now().toString(),
        sender: "You",
        message: chatMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }
      setMessages([...messages, newMessage])
      setChatMessage("")
    }
  }

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur-xl border-b border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-primary to-primary/80 rounded flex items-center justify-center">
                <Mic className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="text-white font-medium">Recording Studio</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Recording indicator */}
            {isRecording && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 px-3 py-1">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2" />
                REC {formatTime(recordingTime)}
              </Badge>
            )}

            <div className="flex items-center space-x-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {participants.length} participants
              </Badge>
              <ThemeToggle />
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <Settings className="w-4 h-4" />
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
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 overflow-hidden relative group">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                <span>You</span>
                {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
              </div>
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70">
                  <Maximize className="w-4 h-4" />
                </Button>
              </div>
              {!isVideoOn && (
                <div className="absolute inset-0 bg-slate-700/90 backdrop-blur-sm flex items-center justify-center">
                  <div className="w-20 h-20 bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-2xl font-medium">JD</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Remote Participants */}
            {participants.slice(1).map((participant, index) => (
              <Card
                key={participant.id}
                className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 overflow-hidden relative group"
              >
                <div className="w-full h-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center">
                  {participant.isVideoOn ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-white text-lg">📹 {participant.name}</span>
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
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-white text-sm flex items-center space-x-2">
                  <span>{participant.name}</span>
                  {participant.isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                </div>
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

            {/* Empty slots for more participants */}
            {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, index) => (
              <Card
                key={`empty-${index}`}
                className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30 border-dashed flex items-center justify-center"
              >
                <div className="text-center text-slate-500">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">Waiting for participant...</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="w-80 bg-slate-800/50 backdrop-blur-xl border-l border-slate-700/50 flex flex-col">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium flex items-center">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="text-slate-400 hover:text-white h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">{message.sender}</span>
                    <span className="text-xs text-slate-500">{message.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-200 bg-slate-700/50 backdrop-blur-sm rounded-lg p-3 border border-slate-600/30">
                    {message.message}
                  </p>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-700/50">
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-primary"
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} size="sm" className="bg-primary hover:bg-primary/80 px-3">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-800/80 backdrop-blur-xl border-t border-slate-700/50 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
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
          <Button
            onClick={toggleRecording}
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className="rounded-full w-16 h-12 px-6 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Record className="w-5 h-5" />}
          </Button>

          {/* Speaker Control */}
          <Button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            size="lg"
            variant={!isSpeakerOn ? "destructive" : "secondary"}
            className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>

          {/* Chat Toggle */}
          <Button
            onClick={() => setShowChat(!showChat)}
            size="lg"
            variant="secondary"
            className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          {/* Screen Share */}
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full w-12 h-12 p-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Monitor className="w-5 h-5" />
          </Button>

          {/* Leave Call */}
          <Button
            size="lg"
            variant="destructive"
            className="rounded-full w-12 h-12 p-0 ml-8 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
