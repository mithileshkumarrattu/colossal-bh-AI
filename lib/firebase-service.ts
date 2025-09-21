import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import type { User, Chat, Message, Incident, Report } from "./types"

class FirebaseService {
  async createUserWithId(userId: string, userData: Omit<User, "id" | "createdAt" | "lastActive">): Promise<void> {
    await setDoc(doc(db, "users", userId), {
      ...userData,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      isOnline: true,
    })
  }

  // Users
  async createUser(userData: Omit<User, "id" | "createdAt" | "lastActive">): Promise<string> {
    const docRef = await addDoc(collection(db, "users"), {
      ...userData,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
    })
    return docRef.id
  }

  async getUser(userId: string): Promise<User | null> {
    const docRef = doc(db, "users", userId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      } as User
    }
    return null
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const docRef = doc(db, "users", userId)
    await updateDoc(docRef, { ...updates, lastActive: serverTimestamp() })
  }

  async getUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(db, "users"))
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      } as User
    })
  }

  // Public User Discovery
  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, "users"), where("email", "==", email), limit(1))
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
      } as User
    }
    return null
  }

  async getPublicUsers(): Promise<User[]> {
    const querySnapshot = await getDocs(collection(db, "users"))
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        isOnline: data.isOnline || false,
        lastActive: data.lastActive?.toDate() || new Date(),
      } as Partial<User>
    }) as User[]
  }

  // Chats
  async createChat(chatData: Omit<Chat, "id" | "createdAt" | "lastActivity">): Promise<string> {
    const docRef = await addDoc(collection(db, "chats"), {
      ...chatData,
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      messageCount: 0,
      lastMessage: null,
    })
    return docRef.id
  }

  async getChat(chatId: string): Promise<Chat | null> {
    const docRef = doc(db, "chats", chatId)
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),
      } as Chat
    }
    return null
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId),
      orderBy("lastActivity", "desc"),
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),
      } as Chat
    })
  }

  async updateChatActivity(chatId: string, lastMessage?: any): Promise<void> {
    const docRef = doc(db, "chats", chatId)
    const updates: any = { lastActivity: serverTimestamp() }
    if (lastMessage) {
      updates.lastMessage = lastMessage
    }
    await updateDoc(docRef, updates)
  }

  // Messages
  async createMessage(messageData: Omit<Message, "id" | "timestamp">): Promise<string> {
    console.log("[v0] Creating message in chat:", messageData.chatId)

    // Store message in subcollection: /chats/{chatId}/messages/{messageId}
    const messagesRef = collection(db, "chats", messageData.chatId, "messages")
    const docRef = await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp(),
    })

    const chatRef = doc(db, "chats", messageData.chatId)
    const chatDoc = await getDoc(chatRef)
    const currentCount = chatDoc.data()?.messageCount || 0

    await updateDoc(chatRef, {
      lastActivity: serverTimestamp(),
      messageCount: currentCount + 1,
      lastMessage: {
        text: messageData.text,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        timestamp: serverTimestamp(),
        flagged: messageData.flagged,
      },
    })

    if (messageData.flagged) {
      await this.createAlert({
        chatId: messageData.chatId,
        messageId: docRef.id,
        senderId: messageData.senderId,
        senderName: messageData.senderName,
        messageText: messageData.text,
        toxicityScore: messageData.toxicityScore,
        severity: messageData.severity,
        categories: messageData.flagCategories || [],
        context: messageData.context,
        aiAnalysis: messageData.aiAnalysis,
      })
    }

    console.log("[v0] Message created successfully:", docRef.id)
    return docRef.id
  }

  async getMessages(chatId: string, limitCount = 50): Promise<Message[]> {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"), limit(limitCount))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate() || new Date(),
      } as Message
    })
  }

  subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp", "asc"), limit(100))

    return onSnapshot(
      q,
      (querySnapshot) => {
        const messages = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date(),
          } as Message
        })
        callback(messages)
      },
      (error) => {
        console.error("[v0] Message subscription error:", error)
        callback([])
      },
    )
  }

  subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void): () => void {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", userId),
      orderBy("lastActivity", "desc"),
    )

    return onSnapshot(
      q,
      async (querySnapshot) => {
        console.log("[v0] Chat subscription update - documents:", querySnapshot.docs.length)

        const chats = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const data = doc.data()

            // Get real-time message count from subcollection
            const messagesQuery = query(collection(db, "chats", doc.id, "messages"))
            const messagesSnapshot = await getDocs(messagesQuery)
            const messageCount = messagesSnapshot.size

            // Get latest message with proper error handling
            const latestMessageQuery = query(
              collection(db, "chats", doc.id, "messages"),
              orderBy("timestamp", "desc"),
              limit(1),
            )
            const latestMessageSnapshot = await getDocs(latestMessageQuery)
            const latestMessage = latestMessageSnapshot.docs[0]?.data()

            // Get recent messages for threat analysis
            const recentMessagesQuery = query(
              collection(db, "chats", doc.id, "messages"),
              orderBy("timestamp", "desc"),
              limit(10),
            )
            const recentMessagesSnapshot = await getDocs(recentMessagesQuery)
            const recentMessages = recentMessagesSnapshot.docs.map((msgDoc) => {
              const msgData = msgDoc.data()
              return {
                id: msgDoc.id,
                text: msgData.text,
                flagged: msgData.flagged || false,
                toxicityScore: msgData.toxicityScore || 0,
                timestamp: msgData.timestamp?.toDate() || new Date(),
              }
            })

            return {
              id: doc.id,
              ...data,
              messageCount,
              recentMessages,
              lastMessage: latestMessage
                ? {
                    text: latestMessage.text,
                    senderId: latestMessage.senderId,
                    senderName: latestMessage.senderName,
                    timestamp: latestMessage.timestamp?.toDate() || new Date(),
                    flagged: latestMessage.flagged || false,
                  }
                : null,
              createdAt: data.createdAt?.toDate() || new Date(),
              lastActivity: data.lastActivity?.toDate() || new Date(),
              unreadCount: 0, // Will be calculated based on user's last read timestamp
            } as Chat
          }),
        )

        console.log(
          "[v0] Processed chats with enhanced data:",
          chats.map((c) => ({ id: c.id, title: c.title, count: c.messageCount })),
        )
        callback(chats)
      },
      (error) => {
        console.error("[v0] Chat subscription error:", error)
        // Don't clear chats on error, maintain existing state
      },
    )
  }

  // Chat with Participant Details
  async getChatWithParticipants(chatId: string): Promise<(Chat & { participantDetails: User[] }) | null> {
    const chat = await this.getChat(chatId)
    if (!chat) return null

    const participantDetails = await Promise.all(
      chat.participants.map(async (participantId) => {
        const user = await this.getUser(participantId)
        return user || ({ id: participantId, displayName: "Unknown User", email: "", isOnline: false } as User)
      }),
    )

    return { ...chat, participantDetails }
  }

  async findOrCreateDirectChat(userId1: string, userId2: string, title?: string): Promise<string> {
    // Check if chat already exists between these two users (both directions)
    const q1 = query(collection(db, "chats"), where("participants", "array-contains", userId1))
    const querySnapshot1 = await getDocs(q1)

    // Find existing chat with both participants
    const existingChat = querySnapshot1.docs.find((doc) => {
      const participants = doc.data().participants
      return participants.includes(userId2) && participants.length === 2
    })

    if (existingChat) {
      console.log("[v0] Found existing chat:", existingChat.id)
      return existingChat.id
    }

    // Create new chat with proper participant setup
    const user1 = await this.getUser(userId1)
    const user2 = await this.getUser(userId2)

    const chatTitle = title || `${user1?.displayName} & ${user2?.displayName}`

    const chatId = await this.createChat({
      title: chatTitle,
      ownerId: userId1,
      participants: [userId1, userId2],
      context: "social",
      type: "live",
      isActive: true,
    })

    console.log("[v0] Created new chat:", chatId, "between", user1?.displayName, "and", user2?.displayName)
    return chatId
  }

  // Incidents
  async createIncident(incidentData: Omit<Incident, "id" | "reportedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "incidents"), {
      ...incidentData,
      reportedAt: serverTimestamp(),
    })
    return docRef.id
  }

  async getIncidents(): Promise<Incident[]> {
    const q = query(collection(db, "incidents"), orderBy("reportedAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        reportedAt: data.reportedAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Incident
    })
  }

  async updateIncident(incidentId: string, updates: Partial<Incident>): Promise<void> {
    const docRef = doc(db, "incidents", incidentId)
    await updateDoc(docRef, updates)
  }

  // Reports
  async createReport(reportData: Omit<Report, "id" | "generatedAt">): Promise<string> {
    const docRef = await addDoc(collection(db, "reports"), {
      ...reportData,
      generatedAt: serverTimestamp(),
    })
    return docRef.id
  }

  async getUserReports(userId: string): Promise<Report[]> {
    const q = query(collection(db, "reports"), where("ownerId", "==", userId), orderBy("generatedAt", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        generatedAt: data.generatedAt?.toDate() || new Date(),
      } as Report
    })
  }

  // Alerts
  async createAlert(alertData: {
    chatId: string
    messageId: string
    senderId: string
    senderName: string
    messageText: string
    toxicityScore: number
    severity: string
    categories: string[]
    context: string
    aiAnalysis?: any
  }): Promise<string> {
    const docRef = await addDoc(collection(db, "alerts"), {
      ...alertData,
      createdAt: serverTimestamp(),
      reviewed: false,
      reviewedAt: null,
      reviewedBy: null,
    })
    console.log("[v0] Alert created:", docRef.id)
    return docRef.id
  }

  async getUserAlerts(userId: string): Promise<any[]> {
    // Get alerts from chats where user is a participant
    const userChats = await this.getUserChats(userId)
    const chatIds = userChats.map((chat) => chat.id)

    if (chatIds.length === 0) return []

    const q = query(collection(db, "alerts"), where("chatId", "in", chatIds), orderBy("createdAt", "desc"), limit(50))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
      }
    })
  }

  async markAlertAsReviewed(alertId: string, reviewedBy: string): Promise<void> {
    const docRef = doc(db, "alerts", alertId)
    await updateDoc(docRef, {
      reviewed: true,
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewedBy,
    })
  }

  // Chat Restrictions
  async createChatRestriction(restrictionData: {
    chatId: string
    restrictedBy: string
    restrictedUserId: string
    reason: string
    messageId?: string
  }): Promise<string> {
    const docRef = await addDoc(collection(db, "chat_restrictions"), {
      ...restrictionData,
      createdAt: serverTimestamp(),
      isActive: true,
      expiresAt: null, // Can be set for temporary restrictions
    })

    // Update chat to mark as restricted
    await updateDoc(doc(db, "chats", restrictionData.chatId), {
      isActive: false,
      restrictedAt: serverTimestamp(),
      restrictedBy: restrictionData.restrictedBy,
    })

    console.log("[v0] Chat restriction created:", docRef.id)
    return docRef.id
  }

  async getChatRestrictions(chatId: string): Promise<any[]> {
    const q = query(
      collection(db, "chat_restrictions"),
      where("chatId", "==", chatId),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate(),
      }
    })
  }

  async removeChatRestriction(restrictionId: string): Promise<void> {
    const docRef = doc(db, "chat_restrictions", restrictionId)
    await updateDoc(docRef, {
      isActive: false,
      removedAt: serverTimestamp(),
    })
  }

  // Community Posts
  async createCommunityPost(postData: any): Promise<string> {
    try {
      console.log("[v0] Creating community post in Firestore:", postData)
      const docRef = await addDoc(collection(db, "community_posts"), {
        ...postData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      console.log("[v0] Community post created successfully with ID:", docRef.id)
      return docRef.id
    } catch (error) {
      console.error("[v0] Error creating community post:", error)
      throw new Error(`Failed to create community post: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async getCommunityPosts(): Promise<any[]> {
    try {
      console.log("[v0] Fetching community posts from Firestore")
      const q = query(collection(db, "community_posts"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const posts = querySnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        }
      })
      console.log("[v0] Successfully fetched", posts.length, "community posts")
      return posts
    } catch (error) {
      console.error("[v0] Error fetching community posts:", error)
      throw error
    }
  }

  async updateCommunityPostLikes(postId: string, likes: string[]): Promise<void> {
    try {
      const docRef = doc(db, "community_posts", postId)
      await updateDoc(docRef, { likes, updatedAt: serverTimestamp() })
      console.log("[v0] Successfully updated likes for post:", postId)
    } catch (error) {
      console.error("[v0] Error updating post likes:", error)
      throw error
    }
  }

  async addCommunityComment(commentData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, "community_comments"), {
        ...commentData,
        createdAt: serverTimestamp(),
      })
      console.log("[v0] Community comment created successfully with ID:", docRef.id)
      return docRef.id
    } catch (error) {
      console.error("[v0] Error creating community comment:", error)
      throw error
    }
  }

  async deleteCommunityPost(postId: string): Promise<void> {
    try {
      await updateDoc(doc(db, "community_posts", postId), {
        deleted: true,
        deletedAt: serverTimestamp(),
      })
      console.log("[v0] Successfully marked post as deleted:", postId)
    } catch (error) {
      console.error("[v0] Error deleting community post:", error)
      throw error
    }
  }

  // Analytics
  async getUserAnalytics(userId: string) {
    console.log("[v0] Loading comprehensive analytics for user:", userId)

    const [chats, alerts] = await Promise.all([this.getUserChats(userId), this.getUserAlerts(userId)])

    // Get all messages from user's chats with enhanced data collection
    const allMessages: Message[] = []
    const threatCategories: { [key: string]: number } = {}
    const contextAnalysis: { [key: string]: { total: number; flagged: number; safetyScore: number } } = {}
    let totalToxicityScore = 0
    let flaggedCount = 0
    let highRiskMessages = 0

    for (const chat of chats) {
      const messages = await this.getMessages(chat.id, 1000)
      allMessages.push(...messages)

      // Initialize context analysis
      if (!contextAnalysis[chat.context]) {
        contextAnalysis[chat.context] = { total: 0, flagged: 0, safetyScore: 0 }
      }

      messages.forEach((msg) => {
        contextAnalysis[chat.context].total++

        if (msg.flagged) {
          flaggedCount++
          contextAnalysis[chat.context].flagged++

          if (msg.severity === "high" || msg.severity === "critical") {
            highRiskMessages++
          }

          if (msg.flagCategories) {
            msg.flagCategories.forEach((category) => {
              threatCategories[category] = (threatCategories[category] || 0) + 1
            })
          }
        }
        totalToxicityScore += msg.toxicityScore || 0
      })
    }

    // Calculate context safety scores
    Object.keys(contextAnalysis).forEach((context) => {
      const data = contextAnalysis[context]
      data.safetyScore = data.total > 0 ? ((data.total - data.flagged) / data.total) * 100 : 100
    })

    const totalMessages = allMessages.length
    const avgToxicity = totalMessages > 0 ? totalToxicityScore / totalMessages : 0
    const flaggedPercentage = totalMessages > 0 ? (flaggedCount / totalMessages) * 100 : 0
    const safetyScore = Math.max(0, 100 - flaggedPercentage * 2)

    // Convert context analysis to array format for charts
    const contextAnalysisArray = Object.entries(contextAnalysis).map(([context, data]) => ({
      context,
      total: data.total,
      flagged: data.flagged,
      safetyScore: data.safetyScore,
    }))

    // Weekly activity data for charts
    const weeklyTrend = this.generateWeeklyActivity(allMessages)

    console.log("[v0] Analytics calculated:", {
      totalMessages,
      flaggedMessages: flaggedCount,
      safetyScore,
      threatCategories: Object.keys(threatCategories).length,
    })

    return {
      totalChats: chats.length,
      activeChats: chats.filter((chat) => chat.isActive).length,
      totalMessages,
      flaggedMessages: flaggedCount,
      highRiskMessages,
      avgToxicity,
      flaggedPercentage,
      safetyScore,
      threatCategories,
      contextAnalysis: contextAnalysisArray,
      weeklyTrend,
      categoryBreakdown: Object.entries(threatCategories).map(([name, value]) => ({
        name: name.replace("_", " ").toUpperCase(),
        value,
        percentage: flaggedCount > 0 ? ((value / flaggedCount) * 100).toFixed(1) : 0,
      })),
      totalAlerts: alerts.length,
      unreadAlerts: alerts.filter((alert) => !alert.reviewed).length,
    }
  }

  async getUserMessages(userId: string): Promise<Message[]> {
    const userChats = await this.getUserChats(userId)
    const chatIds = userChats.map((chat) => chat.id)

    if (chatIds.length === 0) return []

    const allMessages: Message[] = []
    for (const chatId of chatIds) {
      const messages = await this.getMessages(chatId, 1000) // Get more messages for analytics
      allMessages.push(...messages)
    }

    return allMessages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  async getUserIncidents(userId: string): Promise<Incident[]> {
    const userChats = await this.getUserChats(userId)
    const chatIds = userChats.map((chat) => chat.id)

    const q = query(
      collection(db, "incidents"),
      where("chatId", "in", chatIds.length > 0 ? chatIds : [""]),
      orderBy("reportedAt", "desc"),
    )
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        reportedAt: data.reportedAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Incident
    })
  }

  private generateWeeklyActivity(messages: Message[]) {
    const weeklyData: { [key: string]: { total: number; flagged: number } } = {}
    const now = new Date()
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    // Generate last 7 days with day names
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1] // Adjust for Monday start
      const dateKey = date.toISOString().split("T")[0]
      weeklyData[dateKey] = { total: 0, flagged: 0 }
    }

    messages.forEach((msg) => {
      const dateKey = msg.timestamp.toISOString().split("T")[0]
      if (weeklyData[dateKey]) {
        weeklyData[dateKey].total++
        if (msg.flagged) {
          weeklyData[dateKey].flagged++
        }
      }
    })

    return Object.entries(weeklyData).map(([date, data], index) => ({
      day: days[index % 7],
      date,
      total: data.total,
      flagged: data.flagged,
      safe: data.total - data.flagged,
    }))
  }
}

export const firebaseService = new FirebaseService()
