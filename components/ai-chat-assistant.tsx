"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Bot, User, Send } from "lucide-react"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIChatAssistantProps {
  context: "family" | "workplace" | "educational" | "social"
  onSuggestion?: (suggestion: string) => void
}

export function AIChatAssistant({ context, onSuggestion }: AIChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hi! I'm your AI safety assistant for ${context} conversations. I can help you communicate more effectively and safely. How can I assist you today?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Simulate AI response (in real implementation, call your AI service)
      const response = await generateAIResponse(input, context)

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("AI response error:", error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = async (userInput: string, context: string): Promise<string> => {
    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const lowerInput = userInput.toLowerCase()

    if (lowerInput.includes("help") || lowerInput.includes("suggest")) {
      return `Here are some communication tips for ${context} conversations:

1. Use respectful language and tone
2. Listen actively to others' perspectives
3. Avoid personal attacks or inflammatory language
4. Focus on the issue, not the person
5. Take breaks if conversations become heated

Would you like specific suggestions for a particular situation?`
    }

    if (lowerInput.includes("toxic") || lowerInput.includes("harassment")) {
      return `I understand you're concerned about toxic behavior. Here's how I can help:

• Real-time message analysis before sending
• Alternative phrasing suggestions
• De-escalation techniques
• Evidence documentation for serious incidents

For ${context} contexts, I recommend maintaining a ${getContextTone(context)} tone. Would you like me to review a specific message?`
    }

    if (lowerInput.includes("rephrase") || lowerInput.includes("rewrite")) {
      return `I'd be happy to help you rephrase a message! Please share the text you'd like me to improve, and I'll suggest a more appropriate version for your ${context} conversation.`
    }

    return `I'm here to help you communicate safely and effectively in ${context} settings. I can:

• Analyze messages for potential issues
• Suggest better ways to express your thoughts
• Provide de-escalation strategies
• Help document concerning behavior

What specific assistance do you need today?`
  }

  const getContextTone = (context: string): string => {
    switch (context) {
      case "workplace":
        return "professional and collaborative"
      case "educational":
        return "respectful and constructive"
      case "family":
        return "caring and understanding"
      case "social":
        return "friendly and inclusive"
      default:
        return "respectful"
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (onSuggestion) {
      onSuggestion(suggestion)
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700 h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          <Bot className="w-4 h-4 text-blue-400" />
          AI Safety Assistant
          <Badge className="bg-blue-500/20 text-blue-400 text-xs">{context}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-2 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                    {message.role === "user" ? (
                      <User className="w-3 h-3 text-slate-300" />
                    ) : (
                      <Bot className="w-3 h-3 text-blue-400" />
                    )}
                  </div>
                  <div
                    className={`p-2 rounded-lg text-sm ${
                      message.role === "user" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-100"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-3 h-3 text-blue-400" />
                </div>
                <div className="bg-slate-700 p-2 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-700">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for communication help..."
              className="bg-slate-700 border-slate-600 text-white text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-3 h-3" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
