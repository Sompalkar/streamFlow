/**
 * Services Configuration
 * Initialize and configure all application services
 */

import { v2 as cloudinary } from "cloudinary"
import fs from "fs/promises"

/**
 * Initialize all application services
 */
export const initializeServices = async (): Promise<void> => {
  try {
    // Create necessary directories
    await fs.mkdir("uploads/temp", { recursive: true })
    await fs.mkdir("uploads/processed", { recursive: true })
    console.log("✅ Upload directories created")

    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    // Test Cloudinary connection
    try {
      await cloudinary.api.ping()
      console.log("✅ Cloudinary connection verified")
    } catch (error) {
      console.warn("⚠️ Cloudinary connection failed:", error)
    }

    console.log("✅ All services initialized successfully")
  } catch (error) {
    console.error("❌ Service initialization error:", error)
    throw error
  }
}
