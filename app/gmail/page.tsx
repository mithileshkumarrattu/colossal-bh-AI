"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { gmailService } from "@/lib/gmail-service"
import { aiService } from "@/lib/ai-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Mail,
  Search,
  RefreshCw,
  AlertTriangle,
  Shield,
  Download,
  Unlink,
  CheckCircle,
  Clock,
  User,
} from "lucide-react"

interface AnalyzedEmail {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
  fullText: string
  toxicityScore: number
  severity: "low" | "medium" | "high" | "critical"
  categories: string[]
  flagged: boolean
  aiAnalysis?: {
    explanation: string
    confidence: number
  }
}

export default function GmailPage() {
  return (
    <ProtectedRoute>
      <GmailContent />
    </ProtectedRoute>
  )
}

function GmailContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [emails, setEmails] = useState<AnalyzedEmail[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [maxResults, setMaxResults] = useState(50)
  const [analytics, setAnalytics] = useState({
    totalEmails: 0,
    flaggedEmails: 0,
    safetyScore: 100,
    threatCategories: {} as { [key: string]: number },
  })

  useEffect(() => {
    checkGmailConnection()
  }, [])

  const checkGmailConnection = async () => {
    const isConnected = await gmailService.initializeAuth()
    setConnected(isConnected)
    if (isConnected) {
      await loadEmails()
    }
  }

  const handleConnect = async () => {
    try {
      setLoading(true)
      const success = await gmailService.authenticate()
      if (success) {
        setConnected(true)
        await loadEmails()
      }
    } catch (error) {
      console.error("[v0] Gmail connection failed:", error)
      alert("Failed to connect to Gmail. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    gmailService.disconnect()
    setConnected(false)
    setEmails([])
    setAnalytics({
      totalEmails: 0,
      flaggedEmails: 0,
      safetyScore: 100,
      threatCategories: {},
    })
  }

  const loadEmails = async () => {
    if (!connected) return

    try {
      setLoading(true)
      console.log("[v0] Loading Gmail messages...")

      let messages = []
      try {
        messages = await gmailService.getMessages("", maxResults)
        console.log("[v0] Loaded", messages.length, "Gmail messages")
      } catch (gmailError) {
        console.error("[v0] Gmail API error:", gmailError)
        alert("Unable to connect to Gmail API. Please check your connection and try again.")
        return
      }

      if (messages.length === 0) {
        console.log("[v0] No messages found, checking connection...")
        const isStillConnected = await gmailService.initializeAuth()
        if (!isStillConnected) {
          setConnected(false)
          throw new Error("Gmail connection lost")
        }
        setEmails([])
        setAnalytics({
          totalEmails: 0,
          flaggedEmails: 0,
          safetyScore: 100,
          threatCategories: {},
        })
        return
      }

      setAnalyzing(true)
      const analyzedEmails: AnalyzedEmail[] = []

      for (const message of messages) {
        const subject = gmailService.getMessageHeader(message, "subject")
        const from = gmailService.getMessageHeader(message, "from")
        const date = new Date(Number.parseInt(message.internalDate)).toISOString()
        const fullText = gmailService.extractMessageText(message)

        try {
          const enhancedAnalysis = await aiService.analyzeMessage(
            `Subject: ${subject}\n\nFrom: ${from}\n\nBody Content:\n${fullText}`,
            "email",
          )

          const bodyAnalysis = await aiService.analyzeMessage(fullText, "email_body")

          const combinedToxicityScore = Math.max(enhancedAnalysis.toxicityScore, bodyAnalysis.toxicityScore)
          const combinedCategories = [...new Set([...enhancedAnalysis.categories, ...bodyAnalysis.categories])]
          const combinedSeverity =
            combinedToxicityScore > 0.8
              ? "critical"
              : combinedToxicityScore > 0.6
                ? "high"
                : combinedToxicityScore > 0.4
                  ? "medium"
                  : "low"

          const analyzedEmail: AnalyzedEmail = {
            id: message.id,
            subject: subject || "No Subject",
            from: from || "Unknown Sender",
            date,
            snippet: message.snippet,
            fullText,
            toxicityScore: combinedToxicityScore,
            severity: combinedSeverity,
            categories: combinedCategories,
            flagged: combinedToxicityScore > 0.3, // Lower threshold for better detection
            aiAnalysis: {
              explanation:
                enhancedAnalysis.explanation ||
                bodyAnalysis.explanation ||
                `Email analyzed with ${(combinedToxicityScore * 100).toFixed(1)}% risk score. ${combinedCategories.length > 0 ? `Detected categories: ${combinedCategories.join(", ")}.` : "No specific threat categories detected."}`,
              confidence: Math.max(enhancedAnalysis.confidence || 0.8, bodyAnalysis.confidence || 0.8),
            },
          }

          analyzedEmails.push(analyzedEmail)
        } catch (analysisError) {
          console.error("[v0] Failed to analyze email:", analysisError)
          analyzedEmails.push({
            id: message.id,
            subject: subject || "No Subject",
            from: from || "Unknown Sender",
            date,
            snippet: message.snippet,
            fullText,
            toxicityScore: 0.1,
            severity: "low",
            categories: [],
            flagged: false,
          })
        }
      }

      setEmails(analyzedEmails)

      const flagged = analyzedEmails.filter((e) => e.flagged)
      const threatCategories: { [key: string]: number } = {}

      flagged.forEach((email) => {
        email.categories.forEach((category) => {
          threatCategories[category] = (threatCategories[category] || 0) + 1
        })
      })

      const safetyScore =
        analyzedEmails.length > 0 ? ((analyzedEmails.length - flagged.length) / analyzedEmails.length) * 100 : 100

      setAnalytics({
        totalEmails: analyzedEmails.length,
        flaggedEmails: flagged.length,
        safetyScore,
        threatCategories,
      })

      console.log("[v0] Enhanced Gmail analysis complete:", {
        total: analyzedEmails.length,
        flagged: flagged.length,
        safetyScore: safetyScore.toFixed(1),
        categories: Object.keys(threatCategories).length,
      })
    } catch (error) {
      console.error("[v0] Failed to load Gmail messages:", error)
      if (error.message.includes("Gmail connection lost")) {
        alert("Gmail connection was lost. Please reconnect your account.")
        setConnected(false)
      } else {
        alert("Failed to load Gmail messages. Please check your internet connection and try again.")
      }
    } finally {
      setLoading(false)
      setAnalyzing(false)
    }
  }

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.fullText.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesSeverity = severityFilter === "all" || email.severity === severityFilter

    return matchesSearch && matchesSeverity
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30"
    }
  }

  const downloadReport = () => {
    const flaggedEmails = emails.filter((e) => e.flagged)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gmail Harassment Detection Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
          .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1e40af; }
          .stat-label { color: #64748b; font-size: 14px; }
          .email-item { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; margin: 10px 0; border-radius: 8px; }
          .email-header { font-weight: bold; color: #dc2626; margin-bottom: 10px; }
          .email-content { background: white; padding: 10px; border-radius: 4px; margin: 10px 0; }
          .email-meta { font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📧 Gmail Harassment Detection Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Account: ${user?.email}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-value">${analytics.totalEmails}</div>
            <div class="stat-label">Total Emails Analyzed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.flaggedEmails}</div>
            <div class="stat-label">Threats Detected</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${analytics.safetyScore.toFixed(1)}%</div>
            <div class="stat-label">Safety Score</div>
          </div>
        </div>
        
        <h2>🚨 Flagged Emails (${flaggedEmails.length} total)</h2>
        ${flaggedEmails
          .map(
            (email) => `
          <div class="email-item">
            <div class="email-header">
              ${email.severity.toUpperCase()} THREAT - ${(email.toxicityScore * 100).toFixed(1)}% Risk Score
            </div>
            <div class="email-meta">
              <strong>From:</strong> ${email.from}<br>
              <strong>Subject:</strong> ${email.subject}<br>
              <strong>Date:</strong> ${new Date(email.date).toLocaleString()}<br>
              <strong>Categories:</strong> ${email.categories.join(", ")}
            </div>
            <div class="email-content">${email.fullText.substring(0, 500)}${email.fullText.length > 500 ? "..." : ""}</div>
            ${email.aiAnalysis ? `<div class="email-meta"><strong>AI Analysis:</strong> ${email.aiAnalysis.explanation}</div>` : ""}
          </div>
        `,
          )
          .join("")}
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280;">
          <p><strong>bh-AI Gmail Harassment Detection</strong></p>
          <p>This report analyzed ${analytics.totalEmails} emails and detected ${analytics.flaggedEmails} potential threats</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `gmail-harassment-report-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
              <img src="/logo.webp" alt="bh-AI" className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Gmail Analysis</h1>
              <p className="text-sm text-muted-foreground">AI-powered harassment detection for your emails</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {connected ? (
              <Button onClick={handleDisconnect} variant="outline" size="sm">
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            ) : (
              <Button onClick={handleConnect} disabled={loading} size="lg">
                {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
                Connect Gmail Account
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {!connected ? (
          <div className="text-center py-12">
            <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Gmail Account</h2>
            <p className="text-muted-foreground mb-6">
              Analyze your emails for harassment and abusive content using AI-powered detection
            </p>
            <Button onClick={handleConnect} disabled={loading} size="lg">
              {loading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <Mail className="w-5 h-5 mr-2" />}
              Connect Gmail Account
            </Button>
          </div>
        ) : (
          <>
            {/* Analytics Overview */}
            <div className="grid gap-6 md:grid-cols-4 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium">Total Emails</span>
                  </div>
                  <div className="text-2xl font-bold">{analytics.totalEmails}</div>
                  <p className="text-xs text-muted-foreground mt-1">Analyzed for threats</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium">Threats Detected</span>
                  </div>
                  <div className="text-2xl font-bold text-red-500">{analytics.flaggedEmails}</div>
                  <p className="text-xs text-muted-foreground mt-1">Require attention</p>
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
                    <RefreshCw className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium">Last Scan</span>
                  </div>
                  <div className="text-sm font-bold">{new Date().toLocaleTimeString()}</div>
                  <Button onClick={loadEmails} disabled={loading || analyzing} size="sm" className="mt-2 w-full">
                    {loading || analyzing ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3 mr-1" />
                    )}
                    Refresh
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search emails by subject, sender, or content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={maxResults.toString()} onValueChange={(value) => setMaxResults(Number.parseInt(value))}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 emails</SelectItem>
                  <SelectItem value="50">50 emails</SelectItem>
                  <SelectItem value="100">100 emails</SelectItem>
                  <SelectItem value="200">200 emails</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={downloadReport} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Loading State */}
            {(loading || analyzing) && (
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin mr-3" />
                    <div>
                      <p className="font-medium">
                        {loading ? "Loading Gmail messages..." : "Analyzing emails with AI..."}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {analyzing ? "This may take a few moments for AI analysis" : "Fetching your recent emails"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Email List */}
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Emails ({filteredEmails.length})</TabsTrigger>
                <TabsTrigger value="flagged" className="relative">
                  Flagged ({filteredEmails.filter((e) => e.flagged).length})
                  {analytics.flaggedEmails > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 text-xs w-5 h-5 p-0 flex items-center justify-center"
                    >
                      {analytics.flaggedEmails}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="safe">Safe ({filteredEmails.filter((e) => !e.flagged).length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {filteredEmails.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No emails found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || severityFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "Click refresh to load your recent emails"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredEmails.map((email) => (
                      <Card key={email.id} className={email.flagged ? "border-red-500/20 bg-red-500/5" : ""}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{email.subject}</h4>
                                {email.flagged && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <User className="w-3 h-3" />
                                <span className="truncate">{email.from}</span>
                                <Clock className="w-3 h-3 ml-2" />
                                <span>{new Date(email.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={getSeverityColor(email.severity)}>{email.severity}</Badge>
                              <Badge variant="outline" className="text-xs">
                                {(email.toxicityScore * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{email.snippet}</p>

                          {email.categories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {email.categories.map((category) => (
                                <Badge key={category} variant="outline" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {email.aiAnalysis && (
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                              <strong>AI Analysis:</strong> {email.aiAnalysis.explanation}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="flagged" className="space-y-4">
                <div className="space-y-4">
                  {filteredEmails
                    .filter((e) => e.flagged)
                    .map((email) => (
                      <Card key={email.id} className="border-red-500/20 bg-red-500/5">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                <h4 className="font-medium truncate">{email.subject}</h4>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <User className="w-3 h-3" />
                                <span className="truncate">{email.from}</span>
                                <Clock className="w-3 h-3 ml-2" />
                                <span>{new Date(email.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge className={getSeverityColor(email.severity)}>{email.severity}</Badge>
                              <Badge variant="outline" className="text-xs">
                                {(email.toxicityScore * 100).toFixed(0)}% risk
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm mb-3">{email.snippet}</p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {email.categories.map((category) => (
                              <Badge key={category} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>

                          {email.aiAnalysis && (
                            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                              <strong>AI Analysis:</strong> {email.aiAnalysis.explanation}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="safe" className="space-y-4">
                <div className="space-y-4">
                  {filteredEmails
                    .filter((e) => !e.flagged)
                    .map((email) => (
                      <Card key={email.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <h4 className="font-medium truncate">{email.subject}</h4>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <User className="w-3 h-3" />
                                <span className="truncate">{email.from}</span>
                                <Clock className="w-3 h-3 ml-2" />
                                <span>{new Date(email.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Badge className={getSeverityColor(email.severity)}>Safe</Badge>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}
