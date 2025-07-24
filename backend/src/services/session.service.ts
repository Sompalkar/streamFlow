import Session, { type ISession } from "@/models/Session"
import { EmailService } from "@/services/email.service"
import { Types } from "mongoose"

export class SessionService {
  private emailService: EmailService

  constructor() {
    this.emailService = new EmailService()
  }

  async createSession(sessionData: {
    title: string
    description?: string
    creator: string
    participants: Array<{ email: string; name: string }>
    settings: {
      maxParticipants: number
      recordVideo: boolean
      recordAudio: boolean
      allowChat: boolean
      autoTranscribe: boolean
    }
  }) {
    const session = new Session({
      ...sessionData,
      status: "scheduled",
      participants: sessionData.participants.map((p) => ({
        ...p,
        role: "participant",
      })),
      chatMessages: [],
      recordings: [],
    })

    await session.save()
    await session.populate("creator", "name email")

    // Send invitation emails
    const joinUrl = `${process.env.FRONTEND_URL}/studio?session=${session._id}`

    for (const participant of sessionData.participants) {
      try {
        await this.emailService.sendInvitation({
          to: participant.email,
          sessionTitle: session.title,
          sessionId: session._id.toString(),
          inviterName: (session.creator as any).name,
          joinUrl,
        })
      } catch (error) {
        console.error(`Failed to send invitation to ${participant.email}:`, error)
      }
    }

    return session
  }

  async getSessionsByUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit

    const sessions = await Session.find({
      $or: [{ creator: userId }, { "participants.userId": userId }],
    })
      .populate("creator", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Session.countDocuments({
      $or: [{ creator: userId }, { "participants.userId": userId }],
    })

    return {
      sessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async getSessionById(sessionId: string) {
    const session = await Session.findById(sessionId).populate("creator", "name email").populate("recordings")

    if (!session) {
      throw new Error("Session not found")
    }

    return session
  }

  async updateSession(sessionId: string, userId: string, updateData: Partial<ISession>) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    if (session.creator.toString() !== userId) {
      throw new Error("Not authorized to update this session")
    }

    Object.assign(session, updateData)
    await session.save()
    await session.populate("creator", "name email")

    return session
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    if (session.creator.toString() !== userId) {
      throw new Error("Not authorized to delete this session")
    }

    await Session.findByIdAndDelete(sessionId)
    return true
  }

  async joinSession(sessionId: string, userId?: string, guestName?: string) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    // Check if already joined
    const existingParticipant = session.participants.find(
      (p) => p.userId?.toString() === userId || p.name === guestName,
    )

    if (!existingParticipant) {
      session.participants.push({
        userId: userId ? new Types.ObjectId(userId) : undefined,
        name: guestName || "Guest",
        joinedAt: new Date(),
        role: "participant",
      })
      await session.save()
    }

    await session.populate("creator", "name email")
    return session
  }

  async leaveSession(sessionId: string, userId: string) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    const participantIndex = session.participants.findIndex((p) => p.userId?.toString() === userId)

    if (participantIndex > -1) {
      session.participants[participantIndex].leftAt = new Date()
      await session.save()
    }

    return true
  }

  async startRecording(sessionId: string, userId: string) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    if (session.creator.toString() !== userId) {
      throw new Error("Only the session creator can start recording")
    }

    session.status = "active"
    session.startTime = new Date()
    await session.save()
    await session.populate("creator", "name email")

    return session
  }

  async stopRecording(sessionId: string, userId: string) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    if (session.creator.toString() !== userId) {
      throw new Error("Only the session creator can stop recording")
    }

    session.status = "completed"
    session.endTime = new Date()

    if (session.startTime) {
      session.duration = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000)
    }

    await session.save()
    await session.populate("creator", "name email")

    return session
  }

  async getSessionRecordings(sessionId: string, userId: string) {
    const session = await Session.findById(sessionId).populate("recordings")

    if (!session) {
      throw new Error("Session not found")
    }

    // Check if user has access to this session
    const hasAccess =
      session.creator.toString() === userId || session.participants.some((p) => p.userId?.toString() === userId)

    if (!hasAccess) {
      throw new Error("Not authorized to view recordings")
    }

    return session.recordings
  }

  async getSessionAnalytics(sessionId: string, userId: string) {
    const session = await Session.findById(sessionId)

    if (!session) {
      throw new Error("Session not found")
    }

    if (session.creator.toString() !== userId) {
      throw new Error("Not authorized to view analytics")
    }

    return {
      sessionId,
      title: session.title,
      duration: session.duration || 0,
      participantCount: session.participants.length,
      recordingCount: session.recordings.length,
      chatMessageCount: session.chatMessages.length,
      status: session.status,
      createdAt: session.createdAt,
    }
  }
}
