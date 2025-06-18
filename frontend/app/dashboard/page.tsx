"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  Search,
  Calendar,
  Clock,
  Users,
  Play,
  Download,
  MoreHorizontal,
  Mic,
  Video,
  Settings,
  LogOut,
} from "lucide-react"
import Link from "next/link"

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
  },
  {
    id: "2",
    title: "Product Strategy Discussion",
    date: "2024-01-14",
    duration: "1:23:45",
    participants: 3,
    status: "processing",
    thumbnail: "/placeholder.svg?height=120&width=200",
  },
  {
    id: "3",
    title: "Client Interview Session",
    date: "2024-01-12",
    duration: "32:18",
    participants: 2,
    status: "completed",
    thumbnail: "/placeholder.svg?height=120&width=200",
  },
]

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [recordings, setRecordings] = useState(mockRecordings)
  const [user, setUser] = useState({ name: "John Doe", email: "john@example.com" })

  // Filter recordings based on search query
  const filteredRecordings = recordings.filter((recording) =>
    recording.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle creating a new recording session
  const handleNewRecording = () => {
    // TODO: Implement new recording session creation
    console.log("Creating new recording session...")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">StudioFlow</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-slate-700">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
              <span className="text-sm text-slate-700">{user.name}</span>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {user.name.split(" ")[0]}!</h1>
          <p className="text-slate-600">
            Ready to create your next recording? Start a new session or review your past recordings.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card
            className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            onClick={handleNewRecording}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">New Recording</h3>
                <p className="text-sm text-slate-600">Start a fresh recording session</p>
              </div>
            </div>
          </Card>

          <Link href="/studio">
            <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Join Session</h3>
                  <p className="text-sm text-slate-600">Join an existing recording</p>
                </div>
              </div>
            </Card>
          </Link>

          <Card className="p-6 border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Audio Only</h3>
                <p className="text-sm text-slate-600">Record audio-only session</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Recordings Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Recent Recordings</h2>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search recordings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {/* Recordings Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecordings.map((recording) => (
              <Card key={recording.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-video bg-slate-100 rounded-t-lg relative overflow-hidden">
                  <img
                    src={recording.thumbnail || "/placeholder.svg"}
                    alt={recording.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button size="sm" className="bg-white/90 text-slate-900 hover:bg-white">
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-slate-900 truncate">{recording.title}</h3>
                    <Button variant="ghost" size="sm" className="p-1 h-auto">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-slate-600 mb-3">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(recording.date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {recording.duration}
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {recording.participants}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant={recording.status === "completed" ? "default" : "secondary"}
                      className={recording.status === "completed" ? "bg-green-100 text-green-800" : ""}
                    >
                      {recording.status === "completed" ? "Ready" : "Processing"}
                    </Badge>

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

          {/* Empty State */}
          {filteredRecordings.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No recordings found</h3>
              <p className="text-slate-600 mb-4">
                {searchQuery ? "Try adjusting your search terms" : "Start your first recording to see it here"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={handleNewRecording}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Recording
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
