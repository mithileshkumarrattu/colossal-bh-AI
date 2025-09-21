"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { gmailService } from "@/lib/gmail-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Settings,
  Shield,
  MessageCircle,
  FileText,
  AlertTriangle,
  Download,
  Bell,
  Eye,
  CheckCircle,
  Mail,
  Unlink,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import type { Message, Incident, Chat } from "@/lib/types"
import { aiService } from "@/lib/ai-service"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}

function ProfileContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailMessages, setGmailMessages] = useState<any[]>([])
  const [analytics, setAnalytics] = useState({
    totalMessages: 0,
    flaggedMessages: 0,
    highRiskMessages: 0,
    safetyScore: 0,
    weeklyTrend: [] as any[],
    categoryBreakdown: [] as any[],
    contextAnalysis: [] as any[],
    threatCategories: {} as { [key: string]: number },
    totalChats: 0,
    activeChats: 0,
    totalAlerts: 0,
    unreadAlerts: 0,
  })
  const [gmailAnalytics, setGmailAnalytics] = useState({
    totalGmailMessages: 0,
    flaggedGmailMessages: 0,
    gmailSafetyScore: 100,
    gmailThreatCategories: {} as { [key: string]: number },
    senderAnalysis: [] as any[],
    timeAnalysis: [] as any[],
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    console.log("[v0] Setting up comprehensive profile analytics for user:", user.id)

    const initializeGmail = async () => {
      const isConnected = await gmailService.initializeAuth()
      setGmailConnected(isConnected)
      if (isConnected) {
        try {
          const messages = await gmailService.getMessages("", 100)
          setGmailMessages(messages)

          const gmailAnalyzedData = await processGmailAnalytics(messages)
          setGmailAnalytics(gmailAnalyzedData)
        } catch (error) {
          console.error("[v0] Failed to load Gmail messages:", error)
        }
      }
    }

    const unsubscribeChats = firebaseService.subscribeToUserChats(user.id, (userChats) => {
      console.log("[v0] Profile: Real-time chat update with message counts")
      setChats(userChats)
    })

    const loadComprehensiveAnalytics = async () => {
      try {
        const [userAnalytics, userMessages, userIncidents, userAlerts] = await Promise.all([
          firebaseService.getUserAnalytics(user.id),
          firebaseService.getUserMessages(user.id),
          firebaseService.getUserIncidents(user.id),
          firebaseService.getUserAlerts(user.id),
        ])

        console.log("[v0] Profile: Loaded real analytics data:", {
          totalMessages: userAnalytics.totalMessages,
          flaggedMessages: userAnalytics.flaggedMessages,
          safetyScore: userAnalytics.safetyScore,
          threatCategories: Object.keys(userAnalytics.threatCategories).length,
        })

        setMessages(userMessages)
        setIncidents(userIncidents)
        setAlerts(userAlerts)
        setAnalytics(userAnalytics)
      } catch (error) {
        console.error("[v0] Failed to load comprehensive analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    initializeGmail()
    loadComprehensiveAnalytics()

    const interval = setInterval(loadComprehensiveAnalytics, 30000) // Refresh every 30 seconds

    return () => {
      console.log("[v0] Profile: Cleaning up comprehensive subscriptions")
      unsubscribeChats()
      clearInterval(interval)
    }
  }, [authLoading, user])

  const handleConnectGmail = async () => {
    try {
      const success = await gmailService.authenticate()
      if (success) {
        setGmailConnected(true)
        const messages = await gmailService.getMessages("", 100)
        setGmailMessages(messages)

        const gmailAnalyzedData = await processGmailAnalytics(messages)
        setGmailAnalytics(gmailAnalyzedData)
      }
    } catch (error) {
      console.error("[v0] Gmail connection failed:", error)
      alert("Failed to connect to Gmail. Please try again.")
    }
  }

  const handleDisconnectGmail = () => {
    gmailService.disconnect()
    setGmailConnected(false)
    setGmailMessages([])
    setGmailAnalytics({
      totalGmailMessages: 0,
      flaggedGmailMessages: 0,
      gmailSafetyScore: 100,
      gmailThreatCategories: {} as { [key: string]: number },
      senderAnalysis: [] as any[],
      timeAnalysis: [] as any[],
    })
  }

  const handleMarkAlertAsReviewed = async (alertId: string) => {
    if (!user) return

    try {
      await firebaseService.markAlertAsReviewed(alertId, user.id)
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId ? { ...alert, reviewed: true, reviewedAt: new Date(), reviewedBy: user.id } : alert,
        ),
      )
    } catch (error) {
      console.error("Failed to mark alert as reviewed:", error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  const generateEnhancedWeeklyTrend = () => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    const now = new Date()
    const weekData = days.map((day, index) => {
      const date = new Date(now)
      date.setDate(now.getDate() - (6 - index))

      const dayMessages = messages.filter((m) => {
        const msgDate = new Date(m.timestamp)
        return msgDate.toDateString() === date.toDateString()
      })

      const flagged = dayMessages.filter((m) => m.flagged).length
      const safe = dayMessages.length - flagged

      return {
        day,
        safe,
        flagged,
        total: dayMessages.length,
        date: date.toISOString().split("T")[0],
      }
    })

    return weekData
  }

  const generateThreatCategoryChart = () => {
    const categories = Object.entries(analytics.threatCategories || {})
      .map(([name, value]) => ({
        name: name.replace("_", " ").toUpperCase(),
        value,
        percentage: analytics.flaggedMessages > 0 ? ((value / analytics.flaggedMessages) * 100).toFixed(1) : 0,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)

    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]
    return categories.map((cat, index) => ({
      ...cat,
      color: colors[index % colors.length],
    }))
  }

  const handleDownloadReport = () => {
    const flaggedMessages = messages.filter((m) => m.flagged)
    const threatCategories = generateThreatCategoryChart()
    const flaggedGmailMessages = gmailMessages.filter((m) => m.flagged)
    const gmailThreatCategories = Object.entries(gmailAnalytics.gmailThreatCategories || {})
      .map(([name, value]) => ({
        name: name.replace("_", " ").toUpperCase(),
        value,
        percentage:
          gmailAnalytics.flaggedGmailMessages > 0
            ? ((value / gmailAnalytics.flaggedGmailMessages) * 100).toFixed(1)
            : 0,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>bh-AI Comprehensive Safety Profile Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
          .logo { font-size: 24px; margin-bottom: 10px; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
          .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
          .stat-label { color: #64748b; font-size: 14px; }
          .threat-section { margin: 30px 0; }
          .threat-item { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .threat-header { font-weight: bold; color: #dc2626; margin-bottom: 10px; }
          .threat-content { background: white; padding: 10px; border-radius: 4px; margin: 10px 0; }
          .threat-meta { font-size: 12px; color: #6b7280; }
          .context-analysis { margin: 30px 0; }
          .context-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e5e7eb; }
          .alert-section { margin: 30px 0; }
          .alert-item { background: #fff7ed; border: 1px solid #fed7aa; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .chart-section { margin: 30px 0; }
          .category-chart { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; }
          .category-item { background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; }
          .gmail-section { margin: 30px 0; background: #f0f9ff; padding: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🛡️ bh-AI Comprehensive Safety Profile Report</div>
          <h1>${user?.displayName}'s Complete Safety Analytics</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Report includes: Chat Analysis • Gmail Integration • Threat Detection • Real-time Monitoring</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${analytics.safetyScore.toFixed(1)}%</div>
            <div class="stat-label">Overall Safety Score</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.totalMessages}</div>
            <div class="stat-label">Total Messages Analyzed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.totalChats}</div>
            <div class="stat-label">Active Conversations</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.flaggedMessages}</div>
            <div class="stat-label">Threats Detected</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.totalAlerts}</div>
            <div class="stat-label">Security Alerts</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${gmailConnected ? gmailMessages.length : "N/A"}</div>
            <div class="stat-label">Gmail Messages Scanned</div>
          </div>
        </div>

        ${
          gmailConnected
            ? `
        <div class="gmail-section">
          <h2>📧 Gmail Integration Status</h2>
          <p><strong>Status:</strong> Connected and Monitoring</p>
          <p><strong>Messages Analyzed:</strong> ${gmailMessages.length}</p>
          <p><strong>Last Sync:</strong> ${new Date().toLocaleString()}</p>
          <p>Gmail integration provides real-time monitoring of email communications for harassment detection.</p>
        </div>
        `
            : ""
        }
        
        <div class="chart-section">
          <h2>📊 Threat Category Breakdown</h2>
          <div class="category-chart">
            ${threatCategories
              .map(
                (cat) => `
              <div class="category-item">
                <div style="font-size: 18px; font-weight: bold; color: ${cat.color};">${cat.value}</div>
                <div style="font-size: 12px; color: #64748b;">${cat.name}</div>
                <div style="font-size: 10px; color: #64748b;">${cat.percentage}% of threats</div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
        
        <div class="alert-section">
          <h2>🚨 Recent Security Alerts (${alerts.length} total)</h2>
          ${alerts
            .slice(0, 15)
            .map(
              (alert) => `
            <div class="alert-item">
              <div class="threat-header">
                ${alert.severity.toUpperCase()} ALERT - ${(alert.toxicityScore * 100).toFixed(1)}% Risk Score
              </div>
              <div class="threat-content">"${alert.messageText}"</div>
              <div class="threat-meta">
                Date: ${alert.createdAt.toLocaleString()} | 
                Context: ${alert.context} | 
                Categories: ${alert.categories?.join(", ") || "N/A"} |
                Status: ${alert.reviewed ? "✅ Reviewed" : "⏳ Pending Review"}
                ${alert.aiAnalysis?.explanation ? `<br><strong>AI Analysis:</strong> ${alert.aiAnalysis.explanation}` : ""}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="context-analysis">
          <h2>📈 Context Safety Analysis</h2>
          ${analytics.contextAnalysis
            .map(
              (c) => `
            <div class="context-item">
              <span><strong>${c.context.toUpperCase()}</strong> (${c.total} messages)</span>
              <span style="color: ${c.safetyScore > 80 ? "#22c55e" : c.safetyScore > 60 ? "#eab308" : "#ef4444"};">
                ${c.safetyScore.toFixed(1)}% safe
              </span>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="threat-section">
          <h2>⚠️ Detailed Threat Analysis (${flaggedMessages.length} total detections)</h2>
          ${flaggedMessages
            .slice(0, 25)
            .map(
              (m) => `
            <div class="threat-item">
              <div class="threat-header">
                ${m.severity.toUpperCase()} THREAT - ${(m.toxicityScore * 100).toFixed(1)}% Toxicity Score
              </div>
              <div class="threat-content">"${m.text}"</div>
              <div class="threat-meta">
                Date: ${m.timestamp.toLocaleString()} | 
                Context: ${m.context} | 
                Categories: ${m.flagCategories?.join(", ") || "N/A"}
                ${m.aiAnalysis?.explanation ? `<br><strong>AI Analysis:</strong> ${m.aiAnalysis.explanation}` : ""}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
          <p><strong>bh-AI Harassment Detection System</strong></p>
          <p>This comprehensive report includes real-time chat monitoring, Gmail integration, and AI-powered threat analysis</p>
          <p>Report generated with ${analytics.totalMessages} messages analyzed across ${analytics.totalChats} conversations</p>
          <p>For support or questions, contact your system administrator</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bh-ai-comprehensive-report-${user?.displayName}-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const unreadAlerts = analytics.unreadAlerts
  const weeklyTrendData = generateEnhancedWeeklyTrend()
  const threatCategoryData = generateThreatCategoryChart()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/chats")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <img src="/favicon.ico" alt="bh-AI" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Safety Profile</h1>
              <p className="text-sm text-muted-foreground">Your harassment detection analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadAlerts} new alerts
              </Badge>
            )}
            {gmailConnected ? (
              <Button onClick={handleDisconnectGmail} variant="outline" size="sm">
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect Gmail
              </Button>
            ) : (
              <Button onClick={handleConnectGmail} variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Connect Gmail
              </Button>
            )}
            <Button onClick={handleDownloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <ThemeToggle />
            <Button onClick={() => router.push("/settings")} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Profile Overview */}
        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                  <AvatarFallback className="text-lg">{user?.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{user?.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{user?.role}</Badge>
                    {gmailConnected && (
                      <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600">
                        <Mail className="w-3 h-3 mr-1" />
                        Gmail
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Safety Score</span>
              </div>
              <div className="text-2xl font-bold text-green-500">{analytics.safetyScore.toFixed(1)}%</div>
              <Progress value={analytics.safetyScore} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Total Messages</span>
              </div>
              <div className="text-2xl font-bold">{analytics.totalMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {analytics.totalChats} conversations • Live count
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium">Active Alerts</span>
              </div>
              <div className="text-2xl font-bold text-orange-500">{analytics.totalAlerts}</div>
              <p className="text-xs text-muted-foreground mt-1">{unreadAlerts} unread</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts" className="relative">
              Alerts
              {unreadAlerts > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 text-xs w-5 h-5 p-0 flex items-center justify-center"
                >
                  {unreadAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Gmail Integration Status */}
            {gmailConnected && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-500" />
                    Gmail Analytics Dashboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4 mb-6">
                    <div className="bg-green-500/10 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Messages Monitored</div>
                      <div className="text-2xl font-bold text-green-600">{gmailAnalytics.totalGmailMessages}</div>
                    </div>
                    <div className="bg-red-500/10 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Threats Detected</div>
                      <div className="text-2xl font-bold text-red-600">{gmailAnalytics.flaggedGmailMessages}</div>
                    </div>
                    <div className="bg-blue-500/10 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Gmail Safety Score</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {gmailAnalytics.gmailSafetyScore.toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-purple-500/10 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Last Sync</div>
                      <div className="text-sm font-medium">{new Date().toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 mb-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gmail Sender Risk Analysis</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={gmailAnalytics.senderAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="sender" angle={-45} textAnchor="end" height={100} interval={0} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total" fill="#3b82f6" name="Total Messages" />
                            <Bar dataKey="flagged" fill="#ef4444" name="Flagged Messages" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Gmail Activity by Hour</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={gmailAnalytics.timeAnalysis}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="messages" stroke="#8b5cf6" strokeWidth={2} name="Messages" />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Gmail Threat Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(gmailAnalytics.gmailThreatCategories).map(([name, value]) => ({
                              name,
                              value,
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {Object.entries(gmailAnalytics.gmailThreatCategories).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry[1] > 0 ? "#ef4444" : "#22c55e"} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Live Chat Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {chats.slice(0, 6).map((chat) => (
                    <Card key={chat.id} className="border-muted">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm truncate">{chat.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {chat.context}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{chat.messageCount || 0} messages</span>
                          <span className="text-xs text-muted-foreground">
                            {chat.lastActivity.toLocaleDateString()}
                          </span>
                        </div>
                        {chat.lastMessage && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {chat.lastMessage.flagged && "⚠️ "}
                            {chat.lastMessage.text}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Activity Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="safe" stroke="#22c55e" strokeWidth={2} name="Safe Messages" />
                      <Line
                        type="monotone"
                        dataKey="flagged"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Flagged Messages"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Threat Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={threatCategoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                      >
                        {threatCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Context Safety Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.contextAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="context" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" name="Total Messages" />
                    <Bar dataKey="flagged" fill="#ef4444" name="Flagged Messages" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Security Alerts ({analytics.totalAlerts})
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {unreadAlerts} unread
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {alerts.filter((a) => a.reviewed).length} reviewed
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No alerts yet</h3>
                      <p className="text-muted-foreground">
                        Security alerts will appear here when potentially harmful content is detected
                      </p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <Card
                        key={alert.id}
                        className={`${alert.reviewed ? "border-muted" : "border-orange-500/50 bg-orange-500/5"}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle
                                className={`w-4 h-4 ${alert.reviewed ? "text-muted-foreground" : "text-orange-500"}`}
                              />
                              <Badge className={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                              <Badge variant="outline" className="text-xs">
                                {(alert.toxicityScore * 100).toFixed(0)}% risk
                              </Badge>
                              {alert.reviewed && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Reviewed
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {alert.createdAt.toLocaleDateString()}
                              </span>
                              {!alert.reviewed && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkAlertAsReviewed(alert.id)}
                                  className="text-xs"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Mark Reviewed
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Message from {alert.senderName}:</p>
                            <p className="text-sm bg-muted p-2 rounded">"{alert.messageText}"</p>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {alert.context}
                            </Badge>
                            {alert.categories?.map((category) => (
                              <Badge key={category} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>

                          {alert.aiAnalysis?.explanation && (
                            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                              <strong>AI Analysis:</strong> {alert.aiAnalysis.explanation}
                            </div>
                          )}

                          {alert.reviewed && alert.reviewedAt && (
                            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                              Reviewed on {alert.reviewedAt.toLocaleString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="threats" className="space-y-6">
            <div className="grid gap-4">
              {messages
                .filter((m) => m.flagged)
                .slice(0, 10)
                .map((message) => (
                  <Card key={message.id} className="border-red-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <Badge variant="destructive" className="text-xs">
                            {message.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {(message.toxicityScore * 100).toFixed(0)}% toxic
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{message.timestamp.toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm mb-2">"{message.text}"</p>
                      <div className="flex flex-wrap gap-1">
                        {message.flagCategories?.map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                      {message.aiAnalysis?.explanation && (
                        <p className="text-xs text-muted-foreground mt-2">
                          AI Analysis: {message.aiAnalysis.explanation}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="evidence" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Evidence Collection</span>
                  <Button onClick={handleDownloadReport} size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download All Evidence
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Total Evidence Items</div>
                      <div className="text-2xl font-bold">{analytics.flaggedMessages}</div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">High Priority</div>
                      <div className="text-2xl font-bold text-red-500">{analytics.highRiskMessages}</div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Incidents Reported</div>
                      <div className="text-2xl font-bold">{incidents.length}</div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Active Alerts</div>
                      <div className="text-2xl font-bold text-orange-500">{alerts.length}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Safety Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <h4 className="font-medium">Comprehensive Safety Report</h4>
                      <p className="text-sm text-muted-foreground">
                        Complete analysis of your conversation safety with detailed threat breakdown and alert history
                      </p>
                    </div>
                    <Button onClick={handleDownloadReport} size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate HTML Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

const processGmailAnalytics = async (messages: any[]) => {
  const analyzedMessages = []
  const senderCounts: { [key: string]: { total: number; flagged: number } } = {}
  const hourlyActivity: { [key: string]: number } = {}

  for (const message of messages) {
    const from = gmailService.getMessageHeader(message, "from") || "Unknown"
    const fullText = gmailService.extractMessageText(message)
    const date = new Date(Number.parseInt(message.internalDate))
    const hour = date.getHours()

    // Initialize sender tracking
    if (!senderCounts[from]) {
      senderCounts[from] = { total: 0, flagged: 0 }
    }
    senderCounts[from].total++

    // Track hourly activity
    const hourKey = `${hour}:00`
    hourlyActivity[hourKey] = (hourlyActivity[hourKey] || 0) + 1

    try {
      const analysis = await aiService.analyzeMessage(fullText, "email")
      const flagged = analysis.toxicityScore > 0.3

      if (flagged) {
        senderCounts[from].flagged++
      }

      analyzedMessages.push({
        ...message,
        flagged,
        toxicityScore: analysis.toxicityScore,
        categories: analysis.categories,
      })
    } catch (error) {
      console.error("[v0] Failed to analyze Gmail message:", error)
      analyzedMessages.push({
        ...message,
        flagged: false,
        toxicityScore: 0,
        categories: [],
      })
    }
  }

  const flaggedMessages = analyzedMessages.filter((m) => m.flagged)
  const threatCategories: { [key: string]: number } = {}

  flaggedMessages.forEach((msg) => {
    msg.categories.forEach((cat: string) => {
      threatCategories[cat] = (threatCategories[cat] || 0) + 1
    })
  })

  const senderAnalysis = Object.entries(senderCounts)
    .map(([sender, counts]) => ({
      sender: sender.split("<")[0].trim() || sender,
      total: counts.total,
      flagged: counts.flagged,
      riskScore: counts.total > 0 ? (counts.flagged / counts.total) * 100 : 0,
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 10)

  const timeAnalysis = Object.entries(hourlyActivity)
    .map(([hour, count]) => ({
      hour,
      messages: count,
    }))
    .sort((a, b) => Number.parseInt(a.hour) - Number.parseInt(b.hour))

  return {
    totalGmailMessages: messages.length,
    flaggedGmailMessages: flaggedMessages.length,
    gmailSafetyScore: messages.length > 0 ? ((messages.length - flaggedMessages.length) / messages.length) * 100 : 100,
    gmailThreatCategories: threatCategories,
    senderAnalysis,
    timeAnalysis,
  }
}
