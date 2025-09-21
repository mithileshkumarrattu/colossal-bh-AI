"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { aiService } from "@/lib/ai-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, AlertTriangle, Shield, ArrowLeft, MoreVertical, Download, Eye, Check, CheckCheck } from "lucide-react"
import type { Chat, Message, User } from "@/lib/types"

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  )
}

function ChatContent() {
  const { user } = useAuth()
  const params = useParams()
  const router = useRouter()
  const chatId = params.chatId as string

  const [chat, setChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedContext, setSelectedContext] = useState<"family" | "workplace" | "educational" | "social">("social")
  const [evidenceMode, setEvidenceMode] = useState(false)
  const [recordingEvidence, setRecordingEvidence] = useState(false)
  const [evidenceMessages, setEvidenceMessages] = useState<Message[]>([])
  const [participantDetails, setParticipantDetails] = useState<User[]>([])
  const [realTimeThreats, setRealTimeThreats] = useState<Message[]>([])
  const [showAITools, setShowAITools] = useState(false)
  const [chatRestricted, setChatRestricted] = useState(false)
  const [restrictionReason, setRestrictionReason] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [typingUser, setTypingUser] = useState<string>("")
  const [seenMessages, setSeenMessages] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user || !chatId) return

    console.log("[v0] Setting up chat:", chatId)

    firebaseService.getChatWithParticipants(chatId).then((chatData) => {
      if (chatData) {
        console.log("[v0] Chat loaded:", chatData.title, "Participants:", chatData.participantDetails.length)
        setChat(chatData)
        setParticipantDetails(chatData.participantDetails || [])
        setSelectedContext(chatData.context)
      }
      setLoading(false)
    })

    const unsubscribe = firebaseService.subscribeToMessages(chatId, (messageList) => {
      console.log("[v0] Real-time messages update:", messageList.length)
      setMessages(messageList)

      setTimeout(() => {
        const newSeenMessages = new Set(seenMessages)
        messageList.forEach((msg) => {
          if (msg.senderId !== user.id) {
            newSeenMessages.add(msg.id)
          }
        })
        setSeenMessages(newSeenMessages)
      }, 1000)

      const threats = messageList.filter((m) => m.flagged)
      setRealTimeThreats(threats)

      const highRiskMessages = messageList.filter((m) => m.toxicityScore > 0.7)
      if (highRiskMessages.length > 0) {
        setEvidenceMessages((prev) => [...prev, ...highRiskMessages.filter((m) => !prev.find((p) => p.id === m.id))])
      }
    })

    return () => {
      console.log("[v0] Cleaning up chat subscriptions")
      unsubscribe()
    }
  }, [user, chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    let typingTimeout: NodeJS.Timeout

    if (newMessage.trim()) {
      setIsTyping(true)
      setTypingUser(user?.displayName || "")

      typingTimeout = setTimeout(() => {
        setIsTyping(false)
        setTypingUser("")
      }, 1000)
    } else {
      setIsTyping(false)
      setTypingUser("")
    }

    return () => {
      if (typingTimeout) clearTimeout(typingTimeout)
    }
  }, [newMessage, user])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setSending(true)
    setIsTyping(false)
    setTypingUser("")

    try {
      console.log("[v0] Analyzing message:", messageText)

      const analysis = await aiService.analyzeToxicity(messageText, selectedContext)
      const userThreshold = user.contexts?.[selectedContext] || 0.3

      console.log(
        "[v0] Analysis result:",
        analysis.toxicityScore,
        "Threshold:",
        userThreshold,
        "Flagged:",
        analysis.flagged,
      )

      const shouldFlag = analysis.toxicityScore > userThreshold || analysis.flagged

      if (shouldFlag) {
        setRecordingEvidence(true)
        setTimeout(() => setRecordingEvidence(false), 3000)
      }

      await sendMessage(messageText, {
        ...analysis,
        flagged: shouldFlag,
      })
    } catch (error) {
      console.error("[v0] Failed to analyze message:", error)
      await sendMessage(messageText, {
        toxicityScore: 0.0,
        flagged: false,
        categories: [],
        severity: "low",
        confidence: 0.0,
        explanation: "Message sent without analysis due to technical error",
        recommendations: [],
        riskLevel: 0.0,
      })
    } finally {
      setSending(false)
    }
  }

  const sendMessage = async (messageText: string, analysis: any) => {
    if (!user || !chat) return

    try {
      console.log("[v0] Sending message to chat:", chat.id)
      const messageId = await firebaseService.createMessage({
        chatId: chat.id,
        senderId: user.id,
        senderName: user.displayName,
        text: messageText,
        toxicityScore: analysis.toxicityScore,
        flagged: analysis.flagged,
        flagCategories: analysis.categories,
        context: selectedContext,
        severity: analysis.severity,
        confidence: analysis.confidence,
        aiAnalysis: {
          explanation: analysis.explanation,
          recommendations: analysis.recommendations,
          riskLevel: analysis.riskLevel,
        },
      })

      console.log("[v0] Message sent successfully:", messageId)

      if (analysis.flagged && evidenceMode) {
        setEvidenceMessages((prev) => [...prev, { id: messageId, text: messageText, flagged: true } as Message])
      }
    } catch (error) {
      console.error("[v0] Failed to send message:", error)
    }
  }

  const handleDownloadEvidence = () => {
    const flaggedMessages = messages.filter((m) => m.flagged)
    const otherParticipant = participantDetails.find((p) => p.id !== user?.id)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>bh-AI Harassment Evidence Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .logo { font-size: 24px; margin-bottom: 10px; }
          .chat-info { background: #f8f9fa; padding: 20px; margin-bottom: 30px; border-radius: 8px; }
          .message { margin-bottom: 20px; padding: 15px; border-left: 4px solid #dc3545; background: #fff5f5; border-radius: 4px; }
          .message-header { font-weight: bold; margin-bottom: 10px; color: #dc3545; }
          .message-content { margin-bottom: 10px; font-size: 16px; }
          .threat-details { font-size: 14px; color: #666; background: #f8f9fa; padding: 10px; border-radius: 4px; }
          .summary { background: #e3f2fd; padding: 20px; margin-top: 30px; border-radius: 8px; }
          .stats { display: flex; justify-content: space-between; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 24px; font-weight: bold; color: #1976d2; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🛡️ bh-AI</div>
          <h1>Harassment Evidence Report</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="chat-info">
          <h2>Chat Information</h2>
          <p><strong>Chat Title:</strong> ${chat?.title}</p>
          <p><strong>Context:</strong> ${chat?.context}</p>
          <p><strong>Participants:</strong> ${participantDetails.map((p) => p.displayName).join(", ")}</p>
          <p><strong>Chat ID:</strong> ${chat?.id}</p>
          <p><strong>Report Generated By:</strong> ${user?.displayName} (${user?.email})</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-number">${messages.length}</div>
            <div>Total Messages</div>
          </div>
          <div class="stat">
            <div class="stat-number">${flaggedMessages.length}</div>
            <div>Flagged Messages</div>
          </div>
          <div class="stat">
            <div class="stat-number">${((flaggedMessages.length / messages.length) * 100).toFixed(1)}%</div>
            <div>Threat Percentage</div>
          </div>
          <div class="stat">
            <div class="stat-number">${flaggedMessages.filter((m) => m.toxicityScore > 0.7).length}</div>
            <div>High Risk Messages</div>
          </div>
        </div>
        
        <h2>Flagged Messages (${flaggedMessages.length} total)</h2>
        ${flaggedMessages
          .map(
            (m) => `
          <div class="message">
            <div class="message-header">
              ${m.senderName} - ${m.timestamp.toLocaleString()}
            </div>
            <div class="message-content">
              "${m.text}"
            </div>
            <div class="threat-details">
              <strong>Toxicity Score:</strong> ${(m.toxicityScore * 100).toFixed(1)}% | 
              <strong>Severity:</strong> ${m.severity} | 
              <strong>Categories:</strong> ${m.flagCategories?.join(", ") || "N/A"}
              ${m.aiAnalysis?.explanation ? `<br><strong>AI Analysis:</strong> ${m.aiAnalysis.explanation}` : ""}
            </div>
          </div>
        `,
          )
          .join("")}
        
        <div class="summary">
          <h2>Evidence Summary</h2>
          <p>This report contains evidence of potentially harmful communication detected by bh-AI's harassment detection system.</p>
          <p><strong>Detection Accuracy:</strong> ${((flaggedMessages.reduce((sum, m) => sum + m.confidence, 0) / flaggedMessages.length) * 100).toFixed(1)}% average confidence</p>
          <p><strong>Most Common Categories:</strong> ${[...new Set(flaggedMessages.flatMap((m) => m.flagCategories || []))].join(", ")}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Platform:</strong> bh-AI Harassment Detection System</p>
        </div>
      </body>
      </html>
    `

    const blob = new Blob([htmlContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bh-ai-evidence-${chat?.id}-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRestrictChat = async (messageId: string, reason: string) => {
    if (!user || !chat) return

    const message = messages.find((m) => m.id === messageId)
    if (!message || message.senderId === user.id) {
      console.log("[v0] User cannot restrict their own messages")
      return
    }

    try {
      console.log("[v0] Restricting chat due to harmful content")

      await firebaseService.createChatRestriction({
        chatId: chat.id,
        restrictedBy: user.id,
        restrictedUserId: message.senderId,
        reason: reason,
        messageId: messageId,
      })

      setChatRestricted(true)
      setRestrictionReason(reason)

      await firebaseService.createIncident({
        chatId: chat.id,
        messageId: messageId,
        reportedBy: user.id,
        status: "pending",
        severity: message.severity,
        category: message.flagCategories || [],
        description: `Chat restricted due to harmful content: ${reason}`,
      })

      console.log("[v0] Chat restriction applied successfully")
    } catch (error) {
      console.error("[v0] Failed to restrict chat:", error)
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

  const getContextColor = (context: string) => {
    switch (context) {
      case "family":
        return "bg-green-500/20 text-green-400"
      case "workplace":
        return "bg-blue-500/20 text-blue-400"
      case "educational":
        return "bg-purple-500/20 text-purple-400"
      case "social":
        return "bg-orange-500/20 text-orange-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Chat not found</h2>
          <Button onClick={() => router.push("/chats")} variant="outline">
            Back to Chats
          </Button>
        </div>
      </div>
    )
  }

  const flaggedCount = messages.filter((m) => m.flagged).length
  const highRiskCount = messages.filter((m) => m.toxicityScore > 0.7).length
  const otherParticipant = participantDetails.find((p) => p.id !== user?.id)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/chats")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <img src="/favicon.ico" alt="bh-AI" className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{otherParticipant?.displayName || chat?.title}</h1>
            <div className="flex items-center gap-2">
              <Badge className={getContextColor(chat?.context || "social")}>{chat?.context}</Badge>
              {otherParticipant && (
                <div className="flex items-center gap-1">
                  <div
                    className={`w-2 h-2 rounded-full ${otherParticipant.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {otherParticipant.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              )}
              {realTimeThreats.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {realTimeThreats.length} threats detected
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={evidenceMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEvidenceMode(!evidenceMode)}
            className={evidenceMode ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <Eye className="w-4 h-4" />
            {evidenceMode ? "Recording" : "Evidence"}
          </Button>
          {realTimeThreats.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleDownloadEvidence}>
              <Download className="w-4 h-4" />
              Download Report
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          {(realTimeThreats.length > 0 || recordingEvidence) && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    {recordingEvidence
                      ? "⚠️ Threat detected in real-time - Evidence recorded"
                      : `${realTimeThreats.length} threatening messages detected`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEvidenceMode(!evidenceMode)}
                    className="text-xs"
                  >
                    {evidenceMode ? "Stop Recording" : "Record Evidence"}
                  </Button>
                  {realTimeThreats.length > 0 && (
                    <Button size="sm" variant="destructive" onClick={handleDownloadEvidence} className="text-xs">
                      Download Report
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {chatRestricted && (
            <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Chat Restricted</p>
                  <p className="text-xs text-red-500">{restrictionReason}</p>
                </div>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
                  <p className="text-muted-foreground">
                    Send your first message to begin chatting safely with {otherParticipant?.displayName}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    {message.senderId !== user?.id && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={
                            participantDetails.find((p) => p.id === message.senderId)?.photoURL || "/placeholder.svg"
                          }
                        />
                        <AvatarFallback>{message.senderName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`max-w-xs lg:max-md ${message.senderId === user?.id ? "order-first" : ""}`}>
                      {message.senderId !== user?.id && (
                        <p className="text-xs text-muted-foreground mb-1">{message.senderName}</p>
                      )}

                      <Card
                        className={`${
                          message.senderId === user?.id ? "bg-primary text-primary-foreground" : "bg-muted"
                        } ${message.flagged ? "ring-2 ring-red-500/50" : ""}`}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm">{message.text}</p>

                          {message.flagged && (
                            <div
                              className={`mt-2 p-2 rounded border ${
                                message.senderId === user?.id
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : getSeverityColor(message.severity)
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs font-medium">Potentially Harmful Content Detected</span>
                                <Badge variant="outline" className="text-xs">
                                  {(message.toxicityScore * 100).toFixed(0)}% risk
                                </Badge>
                              </div>
                              {message.flagCategories && message.flagCategories.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {message.flagCategories.map((category) => (
                                    <Badge key={category} variant="outline" className="text-xs">
                                      {category}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {message.senderId !== user?.id && !chatRestricted && (
                                <div className="flex gap-2 mt-2">
                                  <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                    Continue Chatting
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="text-xs"
                                    onClick={() =>
                                      handleRestrictChat(
                                        message.id,
                                        `Harmful content detected: ${message.flagCategories?.join(", ") || "inappropriate language"}`,
                                      )
                                    }
                                  >
                                    Restrict Chat
                                  </Button>
                                </div>
                              )}

                              {message.senderId === user?.id && (
                                <div className="text-xs text-red-400 mt-2 p-2 bg-red-500/20 border border-red-500/30 rounded">
                                  <AlertTriangle className="w-3 h-3 inline mr-1 text-red-400" />
                                  <span className="text-red-400">
                                    Your message was flagged as potentially harmful. The recipient can choose to
                                    restrict this conversation.
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="flex items-center gap-1 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {message.senderId === user?.id && (
                          <div className="flex items-center">
                            {seenMessages.has(message.id) ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {message.senderId === user?.id && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.photoURL || "/placeholder.svg"} />
                        <AvatarFallback>{user.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}

              {isTyping && typingUser && typingUser !== user?.displayName && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={otherParticipant?.photoURL || "/placeholder.svg"} />
                    <AvatarFallback>{otherParticipant?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="max-w-xs">
                    <Card className="bg-muted">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1">
                          <div className="flex gap-1">
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            ></div>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">typing...</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="bg-card border-t p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Safe Mode</span>
                  <div
                    className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${evidenceMode ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}
                    onClick={() => setEvidenceMode(!evidenceMode)}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${evidenceMode ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Select value={selectedContext} onValueChange={(value: any) => setSelectedContext(value)}>
                    <SelectTrigger className="w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="workplace">Work</SelectItem>
                      <SelectItem value="educational">School</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>Threshold: {((user?.contexts?.[selectedContext] || 0.3) * 100).toFixed(0)}%</span>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    chatRestricted ? "Chat has been restricted due to harmful content" : "Type your message..."
                  }
                  className="flex-1"
                  disabled={sending || chatRestricted}
                />
                <Button type="submit" disabled={!newMessage.trim() || sending || chatRestricted}>
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
