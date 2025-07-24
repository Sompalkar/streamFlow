import jwt from "jsonwebtoken"


export const generateToken = (payload: { userId: string; email: string }): string => {
  const secret = process.env.JWT_SECRET || "your-secret-key"
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d"

  return jwt.sign(payload, secret, { expiresIn })
}

export const generateRefreshToken = (payload: { userId: string; email: string }): string => {
  const secret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d"

  return jwt.sign(payload, secret, { expiresIn })
}

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || "your-secret-key"
  return jwt.verify(token, secret)
}

export const verifyRefreshToken = (token: string): any => {
  const secret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"
  return jwt.verify(token, secret)
}

