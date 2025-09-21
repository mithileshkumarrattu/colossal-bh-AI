interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body: { data?: string }
    parts?: Array<{ body: { data?: string } }>
  }
  internalDate: string
}

interface GmailThread {
  id: string
  messages: GmailMessage[]
  snippet: string
  historyId: string
}

class GmailService {
  private accessToken: string | null = null
  private readonly clientId = "254098038770-7k0rhv8mel2p3mromapa4b6q5v4cv05u.apps.googleusercontent.com"
  private readonly clientSecret = "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"
  private readonly redirectUri = "https://v0-final-pi-dun.vercel.app/gmail-callback"
  private readonly scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
  ]

  async initializeAuth(): Promise<boolean> {
    try {
      // Check if user is already authenticated
      const token = localStorage.getItem("gmail_access_token")
      if (token) {
        this.accessToken = token
        return await this.validateToken()
      }
      return false
    } catch (error) {
      console.error("[v0] Gmail auth initialization failed:", error)
      return false
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${this.clientId}&` +
        `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
        `scope=${encodeURIComponent(this.scopes.join(" "))}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`

      // Open popup for authentication
      const popup = window.open(authUrl, "gmail-auth", "width=500,height=600")

      return new Promise((resolve) => {
        const messageListener = (event: MessageEvent) => {
          if (event.data?.type === "gmail_auth_success") {
            window.removeEventListener("message", messageListener)
            const token = localStorage.getItem("gmail_access_token")
            if (token) {
              this.accessToken = token
              resolve(true)
            } else {
              resolve(false)
            }
          }
        }

        window.addEventListener("message", messageListener)

        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed)
            window.removeEventListener("message", messageListener)
            // Check if token was set
            const token = localStorage.getItem("gmail_access_token")
            if (token) {
              this.accessToken = token
              resolve(true)
            } else {
              resolve(false)
            }
          }
        }, 1000)

        setTimeout(() => {
          clearInterval(checkClosed)
          window.removeEventListener("message", messageListener)
          if (popup && !popup.closed) {
            popup.close()
          }
          resolve(false)
        }, 60000) // 1 minute timeout
      })
    } catch (error) {
      console.error("[v0] Gmail authentication failed:", error)
      return false
    }
  }

  private async validateToken(): Promise<boolean> {
    try {
      if (!this.accessToken) return false

      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${this.accessToken}`)

      if (!response.ok) {
        this.disconnect()
        return false
      }

      return true
    } catch (error) {
      console.error("[v0] Token validation failed:", error)
      this.disconnect()
      return false
    }
  }

  async getMessages(query = "", maxResults = 50): Promise<GmailMessage[]> {
    if (!this.accessToken) {
      throw new Error("Not authenticated with Gmail")
    }

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?` +
          `q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        if (response.status === 401) {
          this.disconnect()
          throw new Error("Gmail authentication expired. Please reconnect.")
        }
        throw new Error(`Gmail API error: ${response.status}`)
      }

      const data = await response.json()
      const messages: GmailMessage[] = []

      const messagePromises = (data.messages || []).slice(0, maxResults).map(async (messageRef: any) => {
        try {
          const messageResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageRef.id}`,
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
              },
            },
          )

          if (messageResponse.ok) {
            return await messageResponse.json()
          }
          return null
        } catch (error) {
          console.error(`[v0] Failed to fetch message ${messageRef.id}:`, error)
          return null
        }
      })

      const messageResults = await Promise.all(messagePromises)
      messages.push(...messageResults.filter(Boolean))

      return messages
    } catch (error) {
      console.error("[v0] Failed to fetch Gmail messages:", error)
      throw error
    }
  }

  async getThreads(query = "", maxResults = 20): Promise<GmailThread[]> {
    if (!this.accessToken) {
      throw new Error("Not authenticated with Gmail")
    }

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads?` +
          `q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new Error(`Gmail API error: ${response.status}`)
      }

      const data = await response.json()
      const threads: GmailThread[] = []

      for (const threadRef of data.threads || []) {
        const threadResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadRef.id}`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (threadResponse.ok) {
          const thread = await threadResponse.json()
          threads.push(thread)
        }
      }

      return threads
    } catch (error) {
      console.error("[v0] Failed to fetch Gmail threads:", error)
      throw error
    }
  }

  extractMessageText(message: GmailMessage): string {
    try {
      let text = ""

      if (message.payload.body?.data) {
        try {
          text = atob(message.payload.body.data.replace(/-/g, "+").replace(/_/g, "/"))
          if (text.trim()) return this.cleanMessageText(text)
        } catch (e) {
          console.warn("[v0] Failed to decode body data:", e)
        }
      }

      if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.body?.data) {
            try {
              text = atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"))
              if (text.trim()) return this.cleanMessageText(text)
            } catch (e) {
              console.warn("[v0] Failed to decode part data:", e)
            }
          }
        }
      }

      return message.snippet || ""
    } catch (error) {
      console.error("[v0] Failed to extract message text:", error)
      return message.snippet || ""
    }
  }

  private cleanMessageText(text: string): string {
    return text
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/&[a-zA-Z0-9#]+;/g, " ")
      .trim()
      .substring(0, 2000)
  }

  getMessageHeader(message: GmailMessage, headerName: string): string {
    const header = message.payload.headers.find((h) => h.name.toLowerCase() === headerName.toLowerCase())
    return header?.value || ""
  }

  async labelMessage(messageId: string, labelIds: string[]): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error("Not authenticated with Gmail")
    }

    try {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addLabelIds: labelIds,
        }),
      })

      return response.ok
    } catch (error) {
      console.error("[v0] Failed to label message:", error)
      return false
    }
  }

  disconnect(): void {
    this.accessToken = null
    localStorage.removeItem("gmail_access_token")
    console.log("[v0] Gmail disconnected")
  }
}

export const gmailService = new GmailService()
