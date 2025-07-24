"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Calendar, Users, Clock, Play, Settings, Trash2 } from "lucide-react"
import { useAuthStore } from "@/lib/store"

export default function DashboardPage() {
  const router = useRouter()
  const { user, token, isAuthenticated } = useAuthStore()

  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Form state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [participants, setParticipants] = useState("")
  const [settings, setSettings] = useState({
    maxParticipants: 10,
    recordVideo: true,
    recordAudio: true,
    allowChat: true,
    autoTranscribe: true,
  })

  useEffect(() => {
    // if (!isAuthenticated) {
    //   router.push("/auth/login")
    //   return
    // }

    fetchSessions()
  }, [isAuthenticated])

  const fetchSessions = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSessions(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const createSession = async () => {
    if (!title.trim()) return

    try {
      setIsCreating(true)

      // Parse participants
      const participantList = participants
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email)
        .map((email) => ({
          email,
          name: email.split("@")[0], // Use email prefix as name
        }))

      const sessionData = {
        title: title.trim(),
        description: description.trim(),
        participants: participantList,
        settings,
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sessionData),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Session created successfully:", data)

        // Reset form
        setTitle("")
        setDescription("")
        setParticipants("")
        setShowCreateDialog(false)

        // Refresh sessions
        fetchSessions()
      } else {
        const errorData = await response.json()
        console.error("❌ Failed to create session:", errorData)
      }
    } catch (error) {
      console.error("❌ Error creating session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  const joinSession = (sessionId: string) => {
    router.push(`/studio?session=${sessionId}`)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions/${sessionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (response.ok) {
        fetchSessions()
      }
    } catch (error) {
      console.error("Failed to delete session:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Loading Dashboard...</h2>
          <p className="text-muted-foreground">Getting your sessions ready</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-xl border-b border-border/50 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
              <p className="text-muted-foreground mt-2">
                Manage your recording sessions and collaborate with your team
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary/80">
                  <Plus className="w-5 h-5 mr-2" />
                  New Session
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                  <DialogDescription>Set up a new recording session and invite participants</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Session Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter session title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your session"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="participants">Participants</Label>
                    <Input
                      id="participants"
                      placeholder="Enter email addresses separated by commas"
                      value={participants}
                      onChange={(e) => setParticipants(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">Invitation emails will be sent automatically</p>
                  </div>
                  <div className="space-y-3">
                    <Label>Session Settings</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Record Video</span>
                        <input
                          type="checkbox"
                          checked={settings.recordVideo}
                          onChange={(e) => setSettings({ ...settings, recordVideo: e.target.checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Record Audio</span>
                        <input
                          type="checkbox"
                          checked={settings.recordAudio}
                          onChange={(e) => setSettings({ ...settings, recordAudio: e.target.checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Allow Chat</span>
                        <input
                          type="checkbox"
                          checked={settings.allowChat}
                          onChange={(e) => setSettings({ ...settings, allowChat: e.target.checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Auto Transcribe</span>
                        <input
                          type="checkbox"
                          checked={settings.autoTranscribe}
                          onChange={(e) => setSettings({ ...settings, autoTranscribe: e.target.checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createSession} disabled={isCreating || !title.trim()}>
                    {isCreating ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                        Creating...
                      </>
                    ) : (
                      "Create Session"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <p className="text-xs text-muted-foreground">All time sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.filter((s) => s.status === "active").length}</div>
              <p className="text-xs text-muted-foreground">Currently recording</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.filter((s) => s.status === "completed").length}</div>
              <p className="text-xs text-muted-foreground">Finished sessions</p>
            </CardContent>
          </Card>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Sessions</CardTitle>
            <CardDescription>Manage and join your recording sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sessions yet</h3>
                <p className="text-muted-foreground mb-4">Create your first recording session to get started</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{session.title}</h3>
                        <Badge className={getStatusColor(session.status)}>{session.status}</Badge>
                      </div>
                      {session.description && (
                        <p className="text-sm text-muted-foreground mb-2">{session.description}</p>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{session.participants?.length || 0} participants</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(session.createdAt)}</span>
                        </div>
                        {session.duration && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>
                              {Math.floor(session.duration / 60)}m {session.duration % 60}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => joinSession(session._id)}>
                        <Play className="w-4 h-4 mr-2" />
                        Join
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteSession(session._id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
