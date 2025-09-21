import { type NextRequest, NextResponse } from "next/server"
import { aiService } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const { text, context } = await request.json()

    if (!text || !context) {
      return NextResponse.json({ error: "Text and context are required" }, { status: 400 })
    }

    const analysis = await aiService.analyzeToxicity(text, context)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Toxicity analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze toxicity" }, { status: 500 })
  }
}
