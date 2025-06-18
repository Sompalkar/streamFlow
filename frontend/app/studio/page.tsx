"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <Mic className="w-3 h-3 text-white" />
              </div>
              <span className="text-white font-medium">Recording Studio</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Recording indicator */}
            {isRecording && (
              <div className="flex items-center space-x-2 bg-red-600 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-sm font-medium">REC {formatTime(recordingTime)}</span>
              </div>
            )}

            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Video Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-4 h-full">
            {/* Local Video (You) */}
            <Card className="bg-slate-800 border-slate-700 overflow-hidden relative">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-white text-sm">
                You {isMuted && <MicOff className="w-3 h-3 inline ml-1" />}
              </div>
              {!isVideoOn && (
                <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
                  <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xl font-medium">JD</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Remote Participants */}
            {participants.slice(1).map((participant, index) => (
              <Card key={participant.id} className="bg-slate-800 border-slate-700 overflow-hidden relative">
                <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                  {participant.isVideoOn ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <span className="text-white text-lg">📹 {participant.name}</span>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl font-medium">
                        {participant.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-white text-sm flex items-center">
                  {participant.name}
                  {participant.isMuted && <MicOff className="w-3 h-3 ml-1" />}
                </div>
              </Card>
            ))}

            {/* Empty slots for more participants */}
            {Array.from({ length: Math.max(0, 4 - participants.length) }).map((_, index) => (
              <Card
                key={`empty-${index}`}
                className="bg-slate-800 border-slate-700 border-dashed flex items-center justify-center"
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
          <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-medium">Chat</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowChat(false)}
                  className="text-slate-400 hover:text-white"
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
                  <p className="text-sm text-slate-200 bg-slate-700 rounded p-2">{message.message}</p>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div className="flex items-center justify-center space-x-4">
          {/* Microphone Control */}
          <Button
            onClick={toggleMicrophone}
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            className="rounded-full w-12 h-12 p-0"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Video Control */}
          <Button
            onClick={toggleVideo}
            size="lg"
            variant={!isVideoOn ? "destructive" : "secondary"}
            className="rounded-full w-12 h-12 p-0"
          >
            {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          {/* Recording Control */}
          <Button
            onClick={toggleRecording}
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className="rounded-full w-16 h-12 px-6"
          >
            {isRecording ? <Square className="w-5 h-5" /> : <Record className="w-5 h-5" />}
          </Button>

          {/* Speaker Control */}
          <Button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            size="lg"
            variant={!isSpeakerOn ? "destructive" : "secondary"}
            className="rounded-full w-12 h-12 p-0"
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>

          {/* Chat Toggle */}
          <Button
            onClick={() => setShowChat(!showChat)}
            size="lg"
            variant="secondary"
            className="rounded-full w-12 h-12 p-0"
          >
            <MessageCircle className="w-5 h-5" />
          </Button>

          {/* Leave Call */}
          <Button size="lg" variant="destructive" className="rounded-full w-12 h-12 p-0 ml-8">
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
