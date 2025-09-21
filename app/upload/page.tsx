"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { aiService } from "@/lib/ai-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, ArrowLeft, AlertTriangle } from "lucide-react"

interface ParsedMessage {
  timestamp: Date
  sender: string
  text: string
  toxicityScore?: number
}

export default function UploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  )
}

function UploadContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [chatTitle, setChatTitle] = useState("")
  const [selectedContext, setSelectedContext] = useState<"family" | "workplace" | "educational" | "social">("social")
  const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [error, setError] = useState("")

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB")
      return
    }

    if (!selectedFile.name.endsWith(".txt")) {
      setError("Please upload a .txt file")
      return
    }

    setFile(selectedFile)
    setError("")
    parseFile(selectedFile)
  }

  const parseFile = async (file: File) => {
    try {
      const text = await file.text()
      const messages =
        file.name.toLowerCase().includes("whatsapp") || text.includes("[")
          ? parseWhatsAppChat(text)
          : parseGeneralText(text)
      setParsedMessages(messages.slice(0, 5)) // Show first 5 for preview

      if (!chatTitle) {
        setChatTitle(`Imported Chat - ${new Date().toLocaleDateString()}`)
      }
    } catch (error) {
      setError("Failed to parse chat file")
      console.error("Parse error:", error)
    }
  }

  const parseWhatsAppChat = (text: string): ParsedMessage[] => {
    const lines = text.split("\n")
    const messages: ParsedMessage[] = []

    // WhatsApp format: [DD/MM/YYYY, HH:MM:SS] Sender: Message
    const messageRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{4}),\s(\d{1,2}:\d{2}:\d{2})\]\s([^:]+):\s(.+)$/

    for (const line of lines) {
      const match = line.match(messageRegex)
      if (match) {
        const [, date, time, sender, text] = match
        const timestamp = new Date(`${date} ${time}`)

        if (!isNaN(timestamp.getTime())) {
          messages.push({
            timestamp,
            sender: sender.trim(),
            text: text.trim(),
          })
        }
      }
    }

    return messages
  }

  const parseGeneralText = (text: string): ParsedMessage[] => {
    const lines = text.split("\n").filter((line) => line.trim())
    const messages: ParsedMessage[] = []

    // Check if it looks like a chat export format first
    const chatPatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4},?\s+\d{1,2}:\d{2}:\d{2}\s*[AP]?M?\s*-?\s*(.+?):\s*(.+)$/i, // WhatsApp format
      /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*(.+?):\s*(.+)$/i, // Discord format
      /^(.+?)\s*$$\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*[AP]?M?$$:\s*(.+)$/i, // Telegram format
    ]

    let foundChatFormat = false

    for (const line of lines) {
      for (const pattern of chatPatterns) {
        const match = line.match(pattern)
        if (match) {
          foundChatFormat = true
          const [, sender, text] = match
          if (sender && text) {
            messages.push({
              timestamp: new Date(),
              sender: sender.trim(),
              text: text.trim(),
            })
          }
          break
        }
      }
    }

    // If no chat format detected, treat as general document
    if (!foundChatFormat) {
      // Split text into meaningful chunks for analysis
      const chunks = []
      let currentChunk = ""
      const maxChunkSize = 800 // Increased chunk size for better context

      for (const line of lines) {
        if (currentChunk.length + line.length > maxChunkSize) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim())
          currentChunk = line
        } else {
          currentChunk += (currentChunk ? "\n" : "") + line
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim())

      chunks.forEach((chunk, index) => {
        messages.push({
          timestamp: new Date(),
          sender: `Document Section ${index + 1}`,
          text: chunk,
        })
      })
    }

    return messages
  }

  const handleStartAnalysis = async () => {
    if (!user || !file || !chatTitle.trim()) return

    setIsAnalyzing(true)
    setAnalysisProgress(0)

    try {
      // Parse all messages
      const text = await file.text()
      const allMessages =
        file.name.toLowerCase().includes("whatsapp") || text.includes("[")
          ? parseWhatsAppChat(text)
          : parseGeneralText(text)

      if (allMessages.length === 0) {
        throw new Error("No content could be extracted from the file. Please check the file format.")
      }

      // Create chat
      const chatId = await firebaseService.createChat({
        title: chatTitle,
        ownerId: user.id,
        participants: [user.id],
        context: selectedContext,
        type: "historical",
        isActive: false,
      })

      const batchSize = 5 // Reduced batch size for more reliable processing
      let processedCount = 0

      for (let i = 0; i < allMessages.length; i += batchSize) {
        const batch = allMessages.slice(i, i + batchSize)

        await Promise.all(
          batch.map(async (msg) => {
            try {
              const analysis = await aiService.analyzeMessage(msg.text, selectedContext)

              // Create message with enhanced metadata
              await firebaseService.createMessage({
                chatId,
                senderId: "imported",
                senderName: msg.sender,
                text: msg.text,
                toxicityScore: analysis.toxicityScore,
                flagged: analysis.flagged,
                flagCategories: analysis.categories,
                context: selectedContext,
                severity: analysis.severity,
                confidence: analysis.confidence,
                aiAnalysis: {
                  explanation: analysis.explanation,
                  recommendations: analysis.recommendations || [],
                  riskLevel: analysis.toxicityScore,
                },
              })

              processedCount++
            } catch (error) {
              console.error("Failed to process message:", error)
              await firebaseService.createMessage({
                chatId,
                senderId: "imported",
                senderName: msg.sender,
                text: msg.text,
                toxicityScore: 0.1,
                flagged: false,
                flagCategories: [],
                context: selectedContext,
                severity: "low",
                confidence: 0.5,
                aiAnalysis: {
                  explanation: "Analysis unavailable due to processing error",
                  recommendations: [],
                  riskLevel: 0.1,
                },
              })

              processedCount++
            }
          }),
        )

        setAnalysisProgress((processedCount / allMessages.length) * 100)
      }

      console.log(`[v0] Successfully processed ${processedCount} messages`)
      router.push(`/chat/${chatId}`)
    } catch (error) {
      console.error("Analysis error:", error)
      if (error.message.includes("No content could be extracted")) {
        setError("Unable to extract content from file. Please ensure it's a valid text file with readable content.")
      } else if (error.message.includes("AI analysis")) {
        setError("AI analysis service is temporarily unavailable. Please try again later.")
      } else {
        setError("Failed to analyze file. Please check the file format and try again.")
      }
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/chats")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <img src="/logo.webp" alt="bh-AI" className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Upload & Analyze</h1>
            <p className="text-sm text-muted-foreground">Import text files for AI-powered harassment detection</p>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Chat File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select .txt file for AI analysis (max 10MB)</Label>
                <Input id="file-upload" type="file" accept=".txt" onChange={handleFileUpload} />
              </div>

              <div>
                <Label htmlFor="chat-title">Chat Title</Label>
                <Input
                  id="chat-title"
                  value={chatTitle}
                  onChange={(e) => setChatTitle(e.target.value)}
                  placeholder="Enter a title for this chat..."
                />
              </div>

              <div>
                <Label htmlFor="context">Context</Label>
                <Select value={selectedContext} onValueChange={(value: any) => setSelectedContext(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="workplace">Workplace</SelectItem>
                    <SelectItem value="educational">Educational</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Analyzing messages...</span>
                    <span className="text-muted-foreground">{Math.round(analysisProgress)}%</span>
                  </div>
                  <Progress value={analysisProgress} />
                </div>
              )}

              <Button
                onClick={handleStartAnalysis}
                disabled={!file || !chatTitle.trim() || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? "Analyzing with AI..." : "Start AI Analysis"}
              </Button>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedMessages.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-4">Showing first 5 messages from {file?.name}</p>
                  {parsedMessages.map((msg, index) => (
                    <div key={index} className="bg-muted p-3 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{msg.sender}</span>
                        <span className="text-xs text-muted-foreground">{msg.timestamp.toLocaleString()}</span>
                      </div>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center">...and more messages will be processed</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Upload a file to see preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
