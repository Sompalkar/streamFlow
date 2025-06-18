/**
 * API Client
 * Centralized HTTP client for making API requests
 */

import axios, { type AxiosInstance, type AxiosResponse } from "axios"
import { useAuthStore } from "./store"

// API base configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * Request interceptor to add authentication token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

/**
 * Response interceptor to handle common errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // Handle 401 Unauthorized - logout user
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error
