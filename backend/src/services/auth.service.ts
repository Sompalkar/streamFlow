import bcrypt from "bcryptjs"
import User, { type IUser } from "@/models/User"
import { generateToken, generateRefreshToken } from "@/utils/jwt.util"

export class AuthService {
  async register(name: string, email: string, password: string) {
    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      throw new Error("User already exists with this email")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
    })

    await user.save()

    // Generate tokens
    const token = generateToken({ userId: user._id.toString(), email: user.email })
    const refreshToken = generateRefreshToken({ userId: user._id.toString(), email: user.email })

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      token,
      refreshToken,
    }
  }

  async login(email: string, password: string) {
    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      throw new Error("Invalid email or password")
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new Error("Invalid email or password")
    }

    // Generate tokens
    const token = generateToken({ userId: user._id.toString(), email: user.email })
    const refreshToken = generateRefreshToken({ userId: user._id.toString(), email: user.email })

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        plan: user.plan,
        createdAt: user.createdAt,
      },
      token,
      refreshToken,
    }
  }

  async getUserById(userId: string) {
    const user = await User.findById(userId).select("-password")
    if (!user) {
      throw new Error("User not found")
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    }
  }

  async updateUserProfile(userId: string, updateData: Partial<IUser>) {
    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select(
      "-password",
    )

    if (!user) {
      throw new Error("User not found")
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      plan: user.plan,
      createdAt: user.createdAt,
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId)
    if (!user) {
      throw new Error("User not found")
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      throw new Error("Current password is incorrect")
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    user.password = hashedPassword
    await user.save()

    return true
  }

  async refreshToken(userId: string, email: string) {
    return generateToken({ userId, email })
  }

  async logout(userId: string) {
    // In a real app, you might want to blacklist the token
    // For now, we'll just return success
    return true
  }
}
