/**
 * API Client
 * Centralized HTTP client for making API requests
 */

import { useAuthStore } from "./store"

// API base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  success?: boolean
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = useAuthStore.getState().token

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      const data = await response.json()

      if (!response.ok) {
        // Handle 401 Unauthorized - logout user
        if (response.status === 401) {
          useAuthStore.getState().logout()
          if (typeof window !== "undefined") {
            window.location.href = "/auth/login"
          }
        }

        throw new Error(data.message || data.error || "Request failed")
      }

      return { data, success: true }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    })
  }

  async getProfile() {
    return this.request("/auth/me")
  }

  async refreshToken() {
    return this.request("/auth/refresh", { method: "POST" })
  }

  // Session endpoints
  async getSessions(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const query = searchParams.toString()
    return this.request(`/sessions${query ? `?${query}` : ""}`)
  }

  async createSession(data: {
    title: string
    description?: string
    settings?: {
      maxParticipants?: number
      recordVideo?: boolean
      recordAudio?: boolean
      allowChat?: boolean
      autoTranscribe?: boolean
    }
  }) {
    return this.request("/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async getSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}`)
  }

  async updateSession(sessionId: string, data: any) {
    return this.request(`/sessions/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async joinSession(sessionId: string, name?: string) {
    return this.request(`/sessions/${sessionId}/join`, {
      method: "POST",
      body: JSON.stringify({ name }),
    })
  }

  async leaveSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}/leave`, {
      method: "POST",
    })
  }

  async startSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}/start`, {
      method: "POST",
    })
  }

  async stopSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}/stop`, {
      method: "POST",
    })
  }

  async deleteSession(sessionId: string) {
    return this.request(`/sessions/${sessionId}`, {
      method: "DELETE",
    })
  }

  async getSessionRecordings(sessionId: string) {
    return this.request(`/sessions/${sessionId}/recordings`)
  }

  // Recording endpoints
  async getRecordings(params?: { page?: number; limit?: number; status?: string }) {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const query = searchParams.toString()
    return this.request(`/recordings${query ? `?${query}` : ""}`)
  }

  async uploadRecording(file: File, sessionId: string, participantId: string, enableTranscription = false) {
    const formData = new FormData()
    formData.append("recording", file)
    formData.append("sessionId", sessionId)
    formData.append("participantId", participantId)
    formData.append("enableTranscription", enableTranscription.toString())

    const token = useAuthStore.getState().token

    try {
      const response = await fetch(`${this.baseURL}/upload/recording`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Upload failed")
      }

      return { data, success: true }
    } catch (error) {
      console.error("Upload error:", error)
      return {
        error: error instanceof Error ? error.message : "Upload failed",
        success: false,
      }
    }
  }

  async getRecording(recordingId: string) {
    return this.request(`/recordings/${recordingId}`)
  }

  async deleteRecording(recordingId: string) {
    return this.request(`/recordings/${recordingId}`, {
      method: "DELETE",
    })
  }

  // Transcription endpoints
  async getTranscriptionStatus() {
    return this.request("/transcription/status")
  }

  async toggleTranscription(enabled: boolean) {
    return this.request("/transcription/toggle", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
