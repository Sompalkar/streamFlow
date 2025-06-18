/**
 * Global State Management using Zustand
 * Manages authentication, user data, and application state
 */

import { create } from "zustand"
import { persist } from "zustand/middleware"

// Types
interface User {
  _id: string
  name: string
  email: string
  avatar?: string
  plan: "free" | "pro" | "enterprise"
  createdAt: string
}

interface Recording {
  id: string
  title: string
  date: string
  duration: string
  participants: number
  status: "completed" | "processing"
  thumbnail: string
}

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

interface AppState {
  recordings: Recording[]
  currentSession: string | null
  isRecording: boolean

  // Actions
  setRecordings: (recordings: Recording[]) => void
  addRecording: (recording: Recording) => void
  setCurrentSession: (sessionId: string | null) => void
  setRecording: (isRecording: boolean) => void
}

/**
 * Authentication Store
 * Persisted to localStorage for session management
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
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

/**
 * Application State Store
 * For non-persistent app state
 */
export const useAppStore = create<AppState>((set, get) => ({
  recordings: [],
  currentSession: null,
  isRecording: false,

  setRecordings: (recordings: Recording[]) => {
    set({ recordings })
  },

  addRecording: (recording: Recording) => {
    const currentRecordings = get().recordings
    set({ recordings: [recording, ...currentRecordings] })
  },

  setCurrentSession: (sessionId: string | null) => {
    set({ currentSession: sessionId })
  },

  setRecording: (isRecording: boolean) => {
    set({ isRecording })
  },
}))

/**
 * Computed selectors for better performance
 */
export const useAuthUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useAuthToken = () => useAuthStore((state) => state.token)
