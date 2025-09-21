export interface User {
  id: string
  email: string
  displayName: string
  photoURL?: string
  role: "admin" | "moderator" | "user"
  contexts: {
    family: number // 0.0-1.0 toxicity threshold
    workplace: number
    educational: number
    social: number
  }
  notificationsEnabled: boolean
  createdAt: Date
  lastActive: Date
  isOnline: boolean
}

export interface Chat {
  id: string
  title: string
  ownerId: string
  participants: string[]
  context: "family" | "workplace" | "educational" | "social"
  type: "live" | "historical"
  createdAt: Date
  lastActivity: Date
  isActive: boolean
  moderatorId?: string
}

export interface Message {
  id: string
  chatId: string
  senderId: string
  senderName: string
  text: string
  timestamp: Date
  toxicityScore: number
  flagged: boolean
  flagCategories: string[]
  context: string
  severity: "low" | "medium" | "high" | "critical"
  confidence: number
  aiAnalysis?: {
    explanation: string
    recommendations: string[]
    riskLevel: number
  }
}

export interface Incident {
  id: string
  chatId: string
  messageId: string
  reportedBy: string
  reportedAt: Date
  status: "pending" | "reviewed" | "resolved" | "dismissed"
  severity: "low" | "medium" | "high" | "critical"
  category: string[]
  description: string
  actionTaken?: string
  reviewedBy?: string
  reviewedAt?: Date
}

export interface Report {
  id: string
  chatId: string
  ownerId: string
  title: string
  generatedAt: Date
  fileURL: string
  status: "pending" | "complete"
  metrics: {
    totalMessages: number
    flaggedCount: number
    averageToxicity: number
  }
}

export interface ToxicityAnalysis {
  toxicityScore: number
  flagged: boolean
  categories: string[]
  severity: "low" | "medium" | "high" | "critical"
  confidence: number
  explanation: string
  recommendations: string[]
  riskLevel: number
}

export interface Alert {
  id: string
  chatId: string
  messageId: string
  senderId: string
  senderName: string
  messageText: string
  toxicityScore: number
  severity: "low" | "medium" | "high" | "critical"
  categories: string[]
  context: string
  aiAnalysis?: {
    explanation: string
    recommendations: string[]
    riskLevel: number
  }
  createdAt: Date
  reviewed: boolean
  reviewedAt?: Date
  reviewedBy?: string
}

export interface ChatRestriction {
  id: string
  chatId: string
  restrictedBy: string
  restrictedUserId: string
  reason: string
  messageId?: string
  createdAt: Date
  isActive: boolean
  expiresAt?: Date
}
