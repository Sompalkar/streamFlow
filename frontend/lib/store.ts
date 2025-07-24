import { create } from "zustand"
import { persist } from "zustand/middleware"

// Auth Store
interface AuthState {
  user: any | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  setUser: (user: any) => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          })

          if (response.ok) {
            const data = await response.json()
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
            })
            localStorage.setItem("token", data.data.token)
            return true
          }
          return false
        } catch (error) {
          console.error("Login error:", error)
          return false
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/register`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name, email, password }),
            },
          )

          if (response.ok) {
            const data = await response.json()
            set({
              user: data.data.user,
              token: data.data.token,
              isAuthenticated: true,
            })
            localStorage.setItem("token", data.data.token)
            return true
          }
          return false
        } catch (error) {
          console.error("Register error:", error)
          return false
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      },

      setUser: (user: any) => {
        set({ user, isAuthenticated: !!user })
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: !!token })
        localStorage.setItem("token", token)
      },
    }),
    {
      name: "auth-storage",
    },
  ),
)

// Studio Store
interface Message {
  id: string
  sender: string
  senderName: string
  message: string
  timestamp: string
}

interface Participant {
  id: string
  name: string
  email?: string
  isHost: boolean
  isMuted: boolean
  isVideoOn: boolean
  joinedAt: Date
}

interface StudioState {
  // Session state
  sessionId: string | null
  isConnected: boolean
  isHost: boolean

  // Recording state
  isRecording: boolean
  recordingTime: number
  recordingBlob: Blob | null

  // Media state
  isMuted: boolean
  isVideoOn: boolean
  isSpeakerOn: boolean
  isScreenSharing: boolean

  // UI state
  showChat: boolean
  showParticipants: boolean

  // Data
  participants: Participant[]
  messages: Message[]

  // Actions
  setSessionId: (sessionId: string | null) => void
  setIsConnected: (connected: boolean) => void
  setIsHost: (isHost: boolean) => void
  setIsRecording: (recording: boolean) => void
  setRecordingTime: (time: number) => void
  setRecordingBlob: (blob: Blob | null) => void
  setIsMuted: (muted: boolean) => void
  setIsVideoOn: (videoOn: boolean) => void
  setIsSpeakerOn: (speakerOn: boolean) => void
  setIsScreenSharing: (sharing: boolean) => void
  setShowChat: (show: boolean) => void
  setShowParticipants: (show: boolean) => void
  addParticipant: (participant: Participant) => void
  removeParticipant: (participantId: string) => void
  updateParticipant: (participantId: string, updates: Partial<Participant>) => void
  addMessage: (message: Message) => void
  clearMessages: () => void
  resetStudio: () => void
}

export const useStudioStore = create<StudioState>((set, get) => ({
  // Initial state
  sessionId: null,
  isConnected: false,
  isHost: false,
  isRecording: false,
  recordingTime: 0,
  recordingBlob: null,
  isMuted: false,
  isVideoOn: true,
  isSpeakerOn: true,
  isScreenSharing: false,
  showChat: false,
  showParticipants: false,
  participants: [],
  messages: [],

  // Actions
  setSessionId: (sessionId) => set({ sessionId }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setIsHost: (isHost) => set({ isHost }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setRecordingTime: (time) => set({ recordingTime: time }),
  setRecordingBlob: (blob) => set({ recordingBlob: blob }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setIsVideoOn: (videoOn) => set({ isVideoOn: videoOn }),
  setIsSpeakerOn: (speakerOn) => set({ isSpeakerOn: speakerOn }),
  setIsScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
  setShowChat: (show) => set({ showChat: show }),
  setShowParticipants: (show) => set({ showParticipants: show }),

  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants, participant],
    })),

  removeParticipant: (participantId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.id !== participantId),
    })),

  updateParticipant: (participantId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) => (p.id === participantId ? { ...p, ...updates } : p)),
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearMessages: () => set({ messages: [] }),

  resetStudio: () =>
    set({
      sessionId: null,
      isConnected: false,
      isHost: false,
      isRecording: false,
      recordingTime: 0,
      recordingBlob: null,
      isMuted: false,
      isVideoOn: true,
      isSpeakerOn: true,
      isScreenSharing: false,
      showChat: false,
      showParticipants: false,
      participants: [],
      messages: [],
    }),
}))
