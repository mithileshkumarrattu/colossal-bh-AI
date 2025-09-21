"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MessageCircle, Plus, Search, Settings, LogOut, Upload, AlertTriangle, Users, TrendingUp } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Chat, User } from "@/lib/types"

export default function ChatsPage() {
  return (
    <ProtectedRoute>
      <ChatsContent />
    </ProtectedRoute>
  )
}

function ChatsContent() {
  const { user, loading: authLoading, logout } = useAuth()
  const router = useRouter()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [contextFilter, setContextFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newChatTitle, setNewChatTitle] = useState("")
  const [newChatContext, setNewChatContext] = useState<"family" | "workplace" | "educational" | "social">("social")
  const [participantEmail, setParticipantEmail] = useState("")
  const [publicUsers, setPublicUsers] = useState<User[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<string>("")

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setChats([])
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)

    async function initializeChats() {
      try {
        if (!isMounted) return

        // First, load chats immediately
        const userChats = await firebaseService.getUserChats(user.id)
        if (isMounted) {
          setChats(userChats)
          setLoading(false)
        }

        // Then set up real-time subscription
        const unsubscribe = firebaseService.subscribeToUserChats(user.id, (updatedChats) => {
          if (isMounted) {
            setChats(updatedChats)
          }
        })

        return unsubscribe
      } catch (error) {
        console.error("[v0] Error initializing chats:", error)
        if (isMounted) setLoading(false)
        return () => {}
      }
    }

    async function loadPublicUsers() {
      try {
        if (!isMounted) return
        const users = await firebaseService.getPublicUsers()
        if (isMounted) setPublicUsers(users)
      } catch (error) {
        console.error("[v0] Failed to load public users:", error)
      }
    }

    let unsubscribe: (() => void) | undefined

    initializeChats().then((unsub) => {
      unsubscribe = unsub
    })

    loadPublicUsers()

    return () => {
      isMounted = false
      if (unsubscribe) unsubscribe()
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [authLoading, user])

  const filteredChats = chats.filter((chat) => {
    const matchesSearch = chat.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesContext = contextFilter === "all" || chat.context === contextFilter
    return matchesSearch && matchesContext
  })

  const handleCreateChat = async () => {
    if (!user || !newChatTitle.trim()) return

    try {
      let chatId: string

      if (selectedParticipant) {
        const selectedUser = publicUsers.find((u) => u.id === selectedParticipant)
        const title = newChatTitle || `${user.displayName} & ${selectedUser?.displayName}`
        chatId = await firebaseService.findOrCreateDirectChat(user.id, selectedParticipant, title)
      } else if (participantEmail.trim()) {
        const participantUser = await firebaseService.getUserByEmail(participantEmail.trim())
        if (participantUser) {
          const title = newChatTitle || `${user.displayName} & ${participantUser.displayName}`
          chatId = await firebaseService.findOrCreateDirectChat(user.id, participantUser.id, title)
        } else {
          alert("User not found with that email address")
          return
        }
      } else {
        chatId = await firebaseService.createChat({
          title: newChatTitle,
          ownerId: user.id,
          participants: [user.id],
          context: newChatContext,
          type: "live",
          isActive: true,
        })
      }

      setIsCreateDialogOpen(false)
      setNewChatTitle("")
      setParticipantEmail("")
      setSelectedParticipant("")
      router.push(`/chat/${chatId}`)
    } catch (error) {
      console.error("[v0] Failed to create chat:", error)
      alert("Failed to create chat. Please try again.")
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

  const getThreatLevel = (chat: Chat) => {
    const recentThreats = chat.recentMessages?.filter((m) => m.flagged).length || 0
    if (recentThreats > 3) return { level: "high", color: "bg-red-500", text: "High Risk" }
    if (recentThreats > 1) return { level: "medium", color: "bg-yellow-500", text: "Medium Risk" }
    return { level: "low", color: "bg-green-500", text: "Safe" }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <img src="/favicon.ico" alt="bh-AI" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">bh-AI</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/community")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Users className="w-4 h-4 mr-2" />
              Community
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/gmail")}
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Gmail
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/upload")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Upload className="w-4 h-4 mr-2" />
              Evidence
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/profile")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={contextFilter} onValueChange={setContextFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contexts</SelectItem>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="workplace">Workplace</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="social">Social</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="chat-title">Chat Title (Optional)</Label>
                    <Input
                      id="chat-title"
                      value={newChatTitle}
                      onChange={(e) => setNewChatTitle(e.target.value)}
                      placeholder="Auto-generated if empty..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="participant-select">Select Participant</Label>
                    <Select value={selectedParticipant} onValueChange={setSelectedParticipant}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user to chat with..." />
                      </SelectTrigger>
                      <SelectContent>
                        {publicUsers
                          .filter((u) => u.id !== user?.id)
                          .map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full ${u.isOnline ? "bg-green-500" : "bg-gray-400"}`}
                                />
                                {u.displayName} ({u.email})
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">or</div>
                  <div>
                    <Label htmlFor="participant-email">Participant Email</Label>
                    <Input
                      id="participant-email"
                      value={participantEmail}
                      onChange={(e) => setParticipantEmail(e.target.value)}
                      placeholder="Enter participant's email..."
                      type="email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="chat-context">Context</Label>
                    <Select value={newChatContext} onValueChange={(value: any) => setNewChatContext(value)}>
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
                  <Button onClick={handleCreateChat} className="w-full">
                    Create Chat
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={() => router.push("/upload")}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Evidence
            </Button>
          </div>
        </div>

        {/* Chat List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchTerm || contextFilter !== "all" ? "No chats found" : "No chats yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || contextFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Create your first chat to get started with secure communication"}
            </p>
            {!searchTerm && contextFilter === "all" && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Chat
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredChats.map((chat) => {
              const threatLevel = getThreatLevel(chat)
              return (
                <Card
                  key={chat.id}
                  className="hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => router.push(`/chat/${chat.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate">{chat.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getContextColor(chat.context)}>{chat.context}</Badge>
                        <div className={`w-2 h-2 rounded-full ${threatLevel.color}`} title={threatLevel.text} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{chat.participants.length} participants</span>
                      </div>
                      <span className="text-muted-foreground">{chat.lastActivity.toLocaleDateString()}</span>
                    </div>
                    {chat.lastMessage && (
                      <div className="text-sm text-muted-foreground truncate mb-2">
                        {chat.lastMessage.flagged && <AlertTriangle className="w-3 h-3 inline mr-1 text-red-500" />}
                        {chat.lastMessage.text}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${chat.isActive ? "bg-green-500" : "bg-muted-foreground"}`}
                        />
                        <span className="text-xs text-muted-foreground">{chat.isActive ? "Active" : "Inactive"}</span>
                      </div>
                      {chat.unreadCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
