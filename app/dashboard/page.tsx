"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import {
  Shield,
  ArrowLeft,
  MessageCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar,
  Eye,
  Settings,
} from "lucide-react"
import type { Chat } from "@/lib/types"

interface AnalyticsData {
  totalChats: number
  activeChats: number
  totalMessages: number
  flaggedMessages: number
  avgToxicity: number
  flaggedPercentage: number
  totalIncidents: number
}

interface ChartData {
  date: string
  toxicity: number
  messages: number
}

interface ContextData {
  context: string
  flagged: number
  total: number
  percentage: number
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [timeRange, setTimeRange] = useState("7d")
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [contextData, setContextData] = useState<ContextData[]>([])

  useEffect(() => {
    if (!user) return

    loadDashboardData()
  }, [user, timeRange])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Load analytics and chats
      const [analyticsData, userChats] = await Promise.all([
        firebaseService.getUserAnalytics(user.id),
        firebaseService.getUserChats(user.id),
      ])

      setAnalytics(analyticsData)
      setChats(userChats)

      // Generate chart data
      await generateChartData(userChats)
      await generateContextData(userChats)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateChartData = async (userChats: Chat[]) => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const data: ChartData[] = []

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]

      // Get messages for this date across all user chats
      let dayMessages = 0
      let dayToxicity = 0
      let toxicityCount = 0

      for (const chat of userChats) {
        try {
          const messages = await firebaseService.getMessages(chat.id, 100)
          const dayMessagesForChat = messages.filter((msg) => {
            const msgDate = new Date(msg.timestamp).toISOString().split("T")[0]
            return msgDate === dateStr
          })

          dayMessages += dayMessagesForChat.length
          dayMessagesForChat.forEach((msg) => {
            if (msg.toxicityScore > 0) {
              dayToxicity += msg.toxicityScore
              toxicityCount++
            }
          })
        } catch (error) {
          console.error("Error loading messages for chart:", error)
        }
      }

      data.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        toxicity: toxicityCount > 0 ? (dayToxicity / toxicityCount) * 100 : 0,
        messages: dayMessages,
      })
    }

    setChartData(data)
  }

  const generateContextData = async (userChats: Chat[]) => {
    const contextStats: Record<string, { flagged: number; total: number }> = {
      family: { flagged: 0, total: 0 },
      workplace: { flagged: 0, total: 0 },
      educational: { flagged: 0, total: 0 },
      social: { flagged: 0, total: 0 },
    }

    for (const chat of userChats) {
      try {
        const messages = await firebaseService.getMessages(chat.id, 100)
        contextStats[chat.context].total += messages.length
        contextStats[chat.context].flagged += messages.filter((msg) => msg.flagged).length
      } catch (error) {
        console.error("Error loading messages for context data:", error)
      }
    }

    const data: ContextData[] = Object.entries(contextStats).map(([context, stats]) => ({
      context,
      flagged: stats.flagged,
      total: stats.total,
      percentage: stats.total > 0 ? (stats.flagged / stats.total) * 100 : 0,
    }))

    setContextData(data)
  }

  const getContextColor = (context: string) => {
    switch (context) {
      case "family":
        return "bg-green-500"
      case "workplace":
        return "bg-blue-500"
      case "educational":
        return "bg-purple-500"
      case "social":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/chats")}
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <img src="/logo.webp" alt="bh-AI" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-sm text-slate-400">Monitor your communication patterns and safety metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/settings")}
              className="text-slate-300 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Profile Card */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                <AvatarFallback className="bg-blue-600 text-white text-lg">
                  {user?.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">{user?.displayName}</h2>
                <p className="text-slate-400">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-slate-300 border-slate-600">
                    {user?.role}
                  </Badge>
                  <span className="text-sm text-slate-500">Member since {user?.createdAt.toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total Messages</CardTitle>
              <MessageCircle className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics?.totalMessages || 0}</div>
              <p className="text-xs text-slate-500">Across all chats</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Flagged Messages</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics?.flaggedMessages || 0}</div>
              <p className="text-xs text-slate-500">{analytics?.flaggedPercentage.toFixed(1)}% of total messages</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Avg Toxicity</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{((analytics?.avgToxicity || 0) * 100).toFixed(1)}%</div>
              <p className="text-xs text-slate-500">Overall safety score</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Active Chats</CardTitle>
              <Users className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics?.activeChats || 0}</div>
              <p className="text-xs text-slate-500">of {analytics?.totalChats || 0} total chats</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Toxicity Trend Chart */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Toxicity Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#F9FAFB",
                    }}
                  />
                  <Line type="monotone" dataKey="toxicity" stroke="#F59E0B" strokeWidth={2} dot={{ fill: "#F59E0B" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Context Comparison Chart */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Flagged by Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contextData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="context" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                      color: "#F9FAFB",
                    }}
                  />
                  <Bar dataKey="flagged" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Chats */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chats.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No chats available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.slice(0, 5).map((chat) => (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 cursor-pointer transition-colors"
                    onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getContextColor(chat.context)}`} />
                      <div>
                        <h4 className="text-white font-medium">{chat.title}</h4>
                        <p className="text-sm text-slate-400">
                          {chat.context} • {chat.lastActivity.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-300 border-slate-600">
                        {chat.type}
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <Eye className="w-4 h-4" />
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
