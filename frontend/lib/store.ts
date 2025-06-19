/**
 * Global State Management using Zustand
 * Manages authentication, sessions, recordings, and UI state
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Socket } from "socket.io-client"

// Types
interface User {
  _id: string
  name: string
  email: string
  avatar?: string
  plan: "free" | "pro" | "enterprise"
  createdAt: string
}

interface Session {
  _id: string
  title: string
  description?: string
  creator: string
  participants: Array<{
    userId?: string
    email?: string
    name: string
    joinedAt?: Date
    leftAt?: Date
    role: "host" | "participant"
  }>
  status: "scheduled" | "active" | "completed" | "cancelled"
  startTime?: Date
  endTime?: Date
  duration?: number
  settings: {
    maxParticipants: number
    recordVideo: boolean
    recordAudio: boolean
    allowChat: boolean
    autoTranscribe: boolean
  }
  recordings: string[]
  chatMessages: Array<{
    userId?: string
    senderName: string
    message: string
    timestamp: Date
  }>
  createdAt: string
  updatedAt: string
}

interface Recording {
  _id: string
  sessionId: string
  userId: string
  fileName: string
  originalName: string
  fileSize: number
  duration: number
  mimeType: string
  quality: "low" | "medium" | "high" | "4k"
  type: "video" | "audio" | "screen"
  cloudinaryUrl: string
  cloudinaryPublicId: string
  thumbnailUrl?: string
  status: "uploading" | "processing" | "completed" | "failed"
  transcription?: {
    text: string
    language: string
    confidence: number
    speakers?: Array<{
      speaker: string
      text: string
      startTime: number
      endTime: number
    }>
    processedAt: Date
  }
  metadata: {
    resolution?: string
    bitrate?: number
    codec?: string
    fps?: number
  }
  createdAt: string
  updatedAt: string
}

interface Participant {
  id: string
  name: string
  email?: string
  isHost: boolean
  isMuted: boolean
  isVideoOn: boolean
  isConnected: boolean
  socketId?: string
  stream?: MediaStream
}

interface ChatMessage {
  id: string
  sender: string
  senderName: string
  message: string
  timestamp: string
}

// Auth Store
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

// Session Store
interface SessionState {
  sessions: Session[]
  currentSession: Session | null
  isLoading: boolean
  error: string | null

  // Actions
  setSessions: (sessions: Session[]) => void
  setCurrentSession: (session: Session | null) => void
  addSession: (session: Session) => void
  updateSession: (sessionId: string, updates: Partial<Session>) => void
  removeSession: (sessionId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

// Studio Store
interface StudioState {
  // Session state
  sessionId: string | null
  sessionStatus: "scheduled" | "active" | "completed" | "cancelled"
  isHost: boolean

  // Recording state
  isRecording: boolean
  recordingTime: number
  recordingStatus: "idle" | "starting" | "recording" | "stopping"

  // Media state
  localStream: MediaStream | null
  isMuted: boolean
  isVideoOn: boolean
  isSpeakerOn: boolean
  isScreenSharing: boolean
  screenStream: MediaStream | null

  // Participants
  participants: Participant[]

  // Chat
  messages: ChatMessage[]
  unreadCount: number

  // UI state
  showChat: boolean
  showParticipants: boolean
  showSettings: boolean
  isFullscreen: boolean

  // Socket connection
  socket: Socket | null
  isConnected: boolean

  // Actions
  setSessionId: (sessionId: string | null) => void
  setSessionStatus: (status: "scheduled" | "active" | "completed" | "cancelled") => void
  setIsHost: (isHost: boolean) => void
  setIsRecording: (isRecording: boolean) => void
  setRecordingTime: (time: number) => void
  setRecordingStatus: (status: "idle" | "starting" | "recording" | "stopping") => void
  setLocalStream: (stream: MediaStream | null) => void
  setIsMuted: (isMuted: boolean) => void
  setIsVideoOn: (isVideoOn: boolean) => void
  setIsSpeakerOn: (isSpeakerOn: boolean) => void
  setIsScreenSharing: (isScreenSharing: boolean) => void
  setScreenStream: (stream: MediaStream | null) => void
  setParticipants: (participants: Participant[]) => void
  addParticipant: (participant: Participant) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  removeParticipant: (participantId: string) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setUnreadCount: (count: number) => void
  setShowChat: (show: boolean) => void
  setShowParticipants: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setIsFullscreen: (isFullscreen: boolean) => void
  setSocket: (socket: Socket | null) => void
  setIsConnected: (isConnected: boolean) => void
  resetStudio: () => void
}

// Recording Store
interface RecordingState {
  recordings: Recording[]
  isLoading: boolean
  error: string | null

  // Actions
  setRecordings: (recordings: Recording[]) => void
  addRecording: (recording: Recording) => void
  updateRecording: (recordingId: string, updates: Partial<Recording>) => void
  removeRecording: (recordingId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

/**
 * Authentication Store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
        // Clear other stores
        useSessionStore.getState().setSessions([])
        useStudioStore.getState().resetStudio()
        useRecordingStore.getState().setRecordings([])
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

/**
 * Session Store
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  setSessions: (sessions: Session[]) => {
    set({ sessions })
  },

  setCurrentSession: (session: Session | null) => {
    set({ currentSession: session })
  },

  addSession: (session: Session) => {
    const currentSessions = get().sessions
    set({ sessions: [session, ...currentSessions] })
  },

  updateSession: (sessionId: string, updates: Partial<Session>) => {
    const sessions = get().sessions.map((session) => (session._id === sessionId ? { ...session, ...updates } : session))
    set({ sessions })

    // Update current session if it's the one being updated
    const currentSession = get().currentSession
    if (currentSession && currentSession._id === sessionId) {
      set({ currentSession: { ...currentSession, ...updates } })
    }
  },

  removeSession: (sessionId: string) => {
    const sessions = get().sessions.filter((session) => session._id !== sessionId)
    set({ sessions })

    // Clear current session if it's the one being removed
    const currentSession = get().currentSession
    if (currentSession && currentSession._id === sessionId) {
      set({ currentSession: null })
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },
}))

/**
 * Studio Store
 */
export const useStudioStore = create<StudioState>((set, get) => ({
  // Session state
  sessionId: null,
  sessionStatus: "scheduled",
  isHost: false,

  // Recording state
  isRecording: false,
  recordingTime: 0,
  recordingStatus: "idle",

  // Media state
  localStream: null,
  isMuted: false,
  isVideoOn: true,
  isSpeakerOn: true,
  isScreenSharing: false,
  screenStream: null,

  // Participants
  participants: [],

  // Chat
  messages: [],
  unreadCount: 0,

  // UI state
  showChat: true,
  showParticipants: false,
  showSettings: false,
  isFullscreen: false,

  // Socket connection
  socket: null,
  isConnected: false,

  // Actions
  setSessionId: (sessionId: string | null) => set({ sessionId }),
  setSessionStatus: (status) => set({ sessionStatus: status }),
  setIsHost: (isHost: boolean) => set({ isHost }),
  setIsRecording: (isRecording: boolean) => set({ isRecording }),
  setRecordingTime: (time: number) => set({ recordingTime: time }),
  setRecordingStatus: (status) => set({ recordingStatus: status }),
  setLocalStream: (stream: MediaStream | null) => set({ localStream: stream }),
  setIsMuted: (isMuted: boolean) => set({ isMuted }),
  setIsVideoOn: (isVideoOn: boolean) => set({ isVideoOn }),
  setIsSpeakerOn: (isSpeakerOn: boolean) => set({ isSpeakerOn }),
  setIsScreenSharing: (isScreenSharing: boolean) => set({ isScreenSharing }),
  setScreenStream: (stream: MediaStream | null) => set({ screenStream: stream }),

  setParticipants: (participants: Participant[]) => set({ participants }),

  addParticipant: (participant: Participant) => {
    const participants = [...get().participants, participant]
    set({ participants })
  },

  updateParticipant: (participantId: string, updates: Partial<Participant>) => {
    const participants = get().participants.map((p) => (p.id === participantId ? { ...p, ...updates } : p))
    set({ participants })
  },

  removeParticipant: (participantId: string) => {
    const participants = get().participants.filter((p) => p.id !== participantId)
    set({ participants })
  },

  setMessages: (messages: ChatMessage[]) => set({ messages }),

  addMessage: (message: ChatMessage) => {
    const messages = [...get().messages, message]
    set({ messages })

    // Increment unread count if chat is not visible
    if (!get().showChat) {
      set({ unreadCount: get().unreadCount + 1 })
    }
  },

  setUnreadCount: (count: number) => set({ unreadCount: count }),
  setShowChat: (show: boolean) => {
    set({ showChat: show })
    if (show) {
      set({ unreadCount: 0 })
    }
  },
  setShowParticipants: (show: boolean) => set({ showParticipants: show }),
  setShowSettings: (show: boolean) => set({ showSettings: show }),
  setIsFullscreen: (isFullscreen: boolean) => set({ isFullscreen }),
  setSocket: (socket: Socket | null) => set({ socket }),
  setIsConnected: (isConnected: boolean) => set({ isConnected }),

  resetStudio: () => {
    // Clean up media streams
    const localStream = get().localStream
    const screenStream = get().screenStream

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop())
    }

    // Disconnect socket
    const socket = get().socket
    if (socket) {
      socket.disconnect()
    }

    set({
      sessionId: null,
      sessionStatus: "scheduled",
      isHost: false,
      isRecording: false,
      recordingTime: 0,
      recordingStatus: "idle",
      localStream: null,
      isMuted: false,
      isVideoOn: true,
      isSpeakerOn: true,
      isScreenSharing: false,
      screenStream: null,
      participants: [],
      messages: [],
      unreadCount: 0,
      showChat: true,
      showParticipants: false,
      showSettings: false,
      isFullscreen: false,
      socket: null,
      isConnected: false,
    })
  },
}))

/**
 * Recording Store
 */
export const useRecordingStore = create<RecordingState>((set, get) => ({
  recordings: [],
  isLoading: false,
  error: null,

  setRecordings: (recordings: Recording[]) => {
    set({ recordings })
  },

  addRecording: (recording: Recording) => {
    const recordings = [recording, ...get().recordings]
    set({ recordings })
  },

  updateRecording: (recordingId: string, updates: Partial<Recording>) => {
    const recordings = get().recordings.map((recording) =>
      recording._id === recordingId ? { ...recording, ...updates } : recording,
    )
    set({ recordings })
  },

  removeRecording: (recordingId: string) => {
    const recordings = get().recordings.filter((recording) => recording._id !== recordingId)
    set({ recordings })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },
}))

// Computed selectors for better performance
export const useAuthUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthToken = () => useAuthStore((state) => state.token)
export const useCurrentSession = () => useSessionStore((state) => state.currentSession)
export const useStudioSession = () =>
  useStudioStore((state) => ({
    sessionId: state.sessionId,
    sessionStatus: state.sessionStatus,
    isHost: state.isHost,
  }))
