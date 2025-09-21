import { type NextRequest, NextResponse } from "next/server"
import { firebaseService } from "@/lib/firebase-service"

export async function POST(request: NextRequest) {
  try {
    const { chatId, userId, dateRange } = await request.json()

    if (!chatId || !userId) {
      return NextResponse.json({ error: "Chat ID and User ID are required" }, { status: 400 })
    }

    // Get chat and messages
    const [chat, messages] = await Promise.all([
      firebaseService.getChat(chatId),
      firebaseService.getMessages(chatId, 1000),
    ])

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Filter messages by date range if provided
    let filteredMessages = messages
    if (dateRange?.start && dateRange?.end) {
      const startDate = new Date(dateRange.start)
      const endDate = new Date(dateRange.end)
      filteredMessages = messages.filter((msg) => msg.timestamp >= startDate && msg.timestamp <= endDate)
    }

    // Calculate metrics
    const flaggedMessages = filteredMessages.filter((msg) => msg.flagged)
    const totalMessages = filteredMessages.length
    const averageToxicity =
      totalMessages > 0 ? filteredMessages.reduce((sum, msg) => sum + msg.toxicityScore, 0) / totalMessages : 0

    // Create report document
    const reportId = await firebaseService.createReport({
      chatId,
      ownerId: userId,
      title: `${chat.title} - Evidence Report`,
      fileURL: "", // Would be populated after PDF generation
      status: "pending",
      metrics: {
        totalMessages,
        flaggedCount: flaggedMessages.length,
        averageToxicity,
      },
    })

    // In a real implementation, you would:
    // 1. Generate PDF using Puppeteer
    // 2. Upload to Firebase Storage
    // 3. Update report with file URL

    return NextResponse.json({
      reportId,
      metrics: {
        totalMessages,
        flaggedCount: flaggedMessages.length,
        averageToxicity,
        flaggedPercentage: totalMessages > 0 ? (flaggedMessages.length / totalMessages) * 100 : 0,
      },
    })
  } catch (error) {
    console.error("Report generation error:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
