/**
 * Multer Configuration
 * File upload configuration and setup
 */

import multer from "multer"
import path from "path"

/**
 * Configure multer for file uploads
 */
export const setupMulter = () => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/temp/")
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
    },
  })

  return multer({
    storage,
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB limit
      files: 1,
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "video/x-msvideo",
        "audio/mp3",
        "audio/mpeg",
        "audio/wav",
        "audio/webm",
        "audio/ogg",
        "audio/x-m4a",
      ]

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error("Invalid file type. Only video and audio files are allowed."))
      }
    },
  })
}
