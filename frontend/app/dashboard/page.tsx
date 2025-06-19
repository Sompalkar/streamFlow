"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Play,
  Download,
  MoreHorizontal,
  Mic,
  Video,
  Settings,
  LogOut,
  TrendingUp,
  FileText,
  Share2,
  Star,
  Grid3X3,
  List,
  Zap,
  Users,
  Copy,
  ExternalLink,
} from "lucide-react"
import { useRouter } from "next/navigation"

// Mock data for recordings
const mockRecordings = [
  {
    id: "1",
    title: "Weekly Team Standup",
    date: "2024-01-15",
    duration: "45:32",
    participants: 5,
    status: "completed",
    thumbnail: "/placeholder.svg?height=120&width=200",
    views: 23,
    transcribed: true,
  },
  {
    id: "2",
    title: "Product Strategy Discussion",
    date: "2024-01-14",
    duration: "1:23:45",
    participants: 3,
    status: "processing",
    thumbnail: "/placeholder.svg?height=120&width=200",
    views: 12,
    transcribed: false,
  },
  {
    id: "3",
    title: "Client Interview Session",
    date: "2024-01-12",
    duration: "32:18",
    participants: 2,
    status: "completed",
    thumbnail: "/placeholder.svg?height=120&width=200",
    views: 45,
    transcribed: true,
  },
  {
    id: "4",
    title: "Marketing Campaign Review",
    date: "2024-01-10",
    duration: "28:45",
    participants: 4,
    status: "completed",
    thumbnail: "/placeholder.svg?height=120&width=200",
    views: 18,
    transcribed: true,
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [recordings, setRecordings] = useState(mockRecordings)
  const [sessions, setSessions] = useState<any[]>([])
  const [user, setUser] = useState({ name: "John Doe", email: "john@example.com", plan: "pro" })
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "processing">("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // Load user data and sessions from localStorage/API
  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
    loadSessions()
  }, [])

  // Load sessions from API
  const loadSessions = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error("Failed to load sessions:", error)
    }
  }

  // Create new session
  const createSession = async () => {
    if (!newSessionTitle.trim()) return

    setIsCreating(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newSessionTitle,
          settings: {
            maxParticipants: 10,
            recordVideo: true,
            recordAudio: true,
            allowChat: true,
            autoTranscribe: false,
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateModal(false)
        setNewSessionTitle("")
        router.push(`/studio?session=${data.session._id}`)
      }
    } catch (error) {
      console.error("Failed to create session:", error)
    } finally {
      setIsCreating(false)
    }
  }

  // Join session
  const joinSession = (sessionId: string) => {
    router.push(`/studio?session=${sessionId}`)
  }

  // Copy session link
  const copySessionLink = (sessionId: string) => {
    const link = `${window.location.origin}/studio?session=${sessionId}`
    navigator.clipboard.writeText(link)
    // Show toast notification
  }

  // Filter recordings based on search query and status
  const filteredRecordings = recordings.filter((recording) => {
    const matchesSearch = recording.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || recording.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const totalRecordings = recordings.length
  const totalViews = recordings.reduce((sum, r) => sum + r.views, 0)
  const completedRecordings = recordings.filter((r) => r.status === "completed").length
  const transcribedRecordings = recordings.filter((r) => r.transcribed).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation Header */}
      <nav className="bg-card/50 backdrop-blur-xl border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Mic className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                StudioFlow
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Badge className="bg-primary/10 text-primary border-primary/20 capitalize">{user.plan} Plan</Badge>
            <ThemeToggle />
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <Button variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user.name.split(" ")[0]}! 👋</h1>
          <p className="text-muted-foreground text-lg">
            Ready to create your next recording? Start a new session or review your past recordings.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Recordings</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{totalRecordings}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Views</p>
                <p className="text-3xl font-bold text-green-700 dark:text-green-300">{totalViews}</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Completed</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{completedRecordings}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Transcribed</p>
                <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{transcribedRecordings}</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Plus className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">New Recording</h3>
                <p className="text-sm text-muted-foreground">Start a fresh recording session</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-green-500/5 to-green-500/10 hover:from-green-500/10 hover:to-green-500/20">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Video className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-green-600 transition-colors">Join Session</h3>
                <p className="text-sm text-muted-foreground">Join an existing recording</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group bg-gradient-to-br from-purple-500/5 to-purple-500/10 hover:from-purple-500/10 hover:to-purple-500/20">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg group-hover:text-purple-600 transition-colors">Quick Record</h3>
                <p className="text-sm text-muted-foreground">Start recording instantly</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Sessions */}
        {sessions.length > 0 && (
          <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm mb-8">
            <div className="p-6">
              <h2 className="text-2xl font-semibold mb-6">Active Sessions</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <Card
                    key={session._id}
                    className="p-4 border border-border/50 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium truncate">{session.title}</h3>
                      <Badge
                        className={
                          session.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {session.participantCount || 0}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(session.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => joinSession(session._id)}
                        className="flex-1 bg-primary hover:bg-primary/80"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Join
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copySessionLink(session._id)} className="px-3">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Recordings Section */}
        <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">Recent Recordings</h2>
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search recordings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64 bg-background/50"
                  />
                </div>

                {/* Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 bg-background/50 border border-border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="processing">Processing</option>
                </select>

                {/* View Mode */}
                <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8 w-8 p-0"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="h-8 w-8 p-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Recordings Grid/List */}
            {viewMode === "grid" ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecordings.map((recording) => (
                  <Card
                    key={recording.id}
                    className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    <div className="aspect-video bg-gradient-to-br from-muted/50 to-muted rounded-t-lg relative overflow-hidden">
                      <img
                        src={recording.thumbnail || "/placeholder.svg"}
                        alt={recording.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" className="bg-white/90 text-foreground hover:bg-white shadow-lg">
                          <Play className="w-4 h-4 mr-2" />
                          Play
                        </Button>
                      </div>
                      {recording.transcribed && (
                        <Badge className="absolute top-2 right-2 bg-green-500 text-white">
                          <FileText className="w-3 h-3 mr-1" />
                          Transcribed
                        </Badge>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {recording.title}
                        </h3>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(recording.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {recording.duration}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={recording.status === "completed" ? "default" : "secondary"}
                            className={
                              recording.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : ""
                            }
                          >
                            {recording.status === "completed" ? "Ready" : "Processing"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{recording.views} views</span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Share2 className="w-4 h-4" />
                          </Button>
                          {recording.status === "completed" && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRecordings.map((recording) => (
                  <Card
                    key={recording.id}
                    className="p-4 border-0 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-12 bg-gradient-to-br from-muted/50 to-muted rounded overflow-hidden">
                        <img
                          src={recording.thumbnail || "/placeholder.svg"}
                          alt={recording.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium mb-1">{recording.title}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{new Date(recording.date).toLocaleDateString()}</span>
                          <span>{recording.duration}</span>
                          <span>{recording.participants} participants</span>
                          <span>{recording.views} views</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={recording.status === "completed" ? "default" : "secondary"}
                          className={
                            recording.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : ""
                          }
                        >
                          {recording.status === "completed" ? "Ready" : "Processing"}
                        </Badge>
                        {recording.transcribed && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Transcribed
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share2 className="w-4 h-4" />
                        </Button>
                        {recording.status === "completed" && (
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {filteredRecordings.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No recordings found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search terms" : "Start your first recording to see it here"}
                </p>
                {!searchQuery && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Recording
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Recording Session</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Session Title</label>
                <Input
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="Enter session title..."
                  className="w-full"
                />
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createSession}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/80"
                  disabled={isCreating || !newSessionTitle.trim()}
                >
                  {isCreating ? "Creating..." : "Create & Join"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
