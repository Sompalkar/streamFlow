/**
 * Database Configuration
 * MongoDB connection setup and configuration
 */

import mongoose from "mongoose"

/**
 * Connect to MongoDB database
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/studioflow"

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    console.log("✅ Connected to MongoDB successfully")

    // Set up database event listeners
    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error)
    })

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected")
    })

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected")
    })
  } catch (error) {
    console.error("❌ MongoDB connection error:", error)
    throw error
  }
}
