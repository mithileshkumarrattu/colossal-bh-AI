"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertTriangle, Shield, Eye, Clock, TrendingUp } from "lucide-react"
import { firebaseService } from "@/lib/firebase-service"
import type { Message, Chat } from "@/lib/types"

interface RealTimeMonitorProps {
  userId: string
}

interface AlertItem {
  id: string
  chatId: string
  chatTitle: string
  message: Message
  timestamp: Date
  severity: "low" | "medium" | "high" | "critical"
}

export function RealTimeMonitor({ userId }: RealTimeMonitorProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [activeChats, setActiveChats] = useState<Chat[]>([])
  const [isMonitoring, setIsMonitoring] = useState(true)

  useEffect(() => {
    if (!userId || !isMonitoring) return

    // Subscribe to user's chats
    const unsubscribeChats = firebaseService.subscribeToUserChats(userId, (chats) => {
      setActiveChats(chats.filter((chat) => chat.isActive))
    })

    return unsubscribeChats
  }, [userId, isMonitoring])

  useEffect(() => {
    if (!activeChats.length || !isMonitoring) return

    const unsubscribers: (() => void)[] = []

    // Subscribe to messages from all active chats
    activeChats.forEach((chat) => {
      const unsubscribe = firebaseService.subscribeToMessages(chat.id, (messages) => {
        // Check for new flagged messages
        const recentFlagged = messages
          .filter((msg) => msg.flagged && msg.timestamp > new Date(Date.now() - 60000)) // Last minute
          .map((msg) => ({
            id: `${chat.id}-${msg.id}`,
            chatId: chat.id,
            chatTitle: chat.title,
            message: msg,
            timestamp: msg.timestamp,
            severity: msg.severity,
          }))

        if (recentFlagged.length > 0) {
          setAlerts((prev) => {
            const newAlerts = recentFlagged.filter((alert) => !prev.some((existing) => existing.id === alert.id))
            return [...prev, ...newAlerts].slice(-20) // Keep last 20 alerts
          })
        }
      })

      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [activeChats, isMonitoring])

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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="w-4 h-4" />
      case "medium":
        return <TrendingUp className="w-4 h-4" />
      default:
        return <Eye className="w-4 h-4" />
    }
  }

  const clearAlerts = () => {
    setAlerts([])
  }

  const toggleMonitoring = () => {
    setIsMonitoring(!isMonitoring)
    if (!isMonitoring) {
      setAlerts([])
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Real-Time Monitor
            {isMonitoring && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMonitoring}
              className={`border-slate-600 text-xs ${
                isMonitoring ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-700 text-slate-300"
              }`}
            >
              {isMonitoring ? "Monitoring" : "Paused"}
            </Button>
            {alerts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAlerts} className="text-slate-400 text-xs">
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300">Active Chats</span>
            <Badge variant="outline" className="text-slate-300 border-slate-600">
              {activeChats.length}
            </Badge>
          </div>

          {/* Alerts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Recent Alerts</span>
              <Badge variant="outline" className="text-slate-300 border-slate-600">
                {alerts.length}
              </Badge>
            </div>

            <ScrollArea className="h-64">
              {alerts.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">
                    {isMonitoring ? "No alerts - all conversations are safe" : "Monitoring paused"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .map((alert) => (
                      <div key={alert.id} className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {getSeverityIcon(alert.severity)}
                              {alert.severity}
                            </Badge>
                            <span className="text-xs text-slate-400">{alert.chatTitle}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {alert.timestamp.toLocaleTimeString()}
                          </div>
                        </div>

                        <div className="text-sm text-slate-300 mb-2">
                          <strong>{alert.message.senderName}:</strong> {alert.message.text}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">
                            Toxicity: {(alert.message.toxicityScore * 100).toFixed(1)}%
                          </div>
                          {alert.message.flagCategories.length > 0 && (
                            <div className="flex gap-1">
                              {alert.message.flagCategories.slice(0, 2).map((category) => (
                                <Badge
                                  key={category}
                                  variant="outline"
                                  className="text-xs border-slate-600 text-slate-400"
                                >
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
