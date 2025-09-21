"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function GmailCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get("code")
        const error = urlParams.get("error")

        if (error) {
          console.error("[v0] Gmail OAuth error:", error)
          window.close()
          return
        }

        if (code) {
          // Exchange code for access token
          const response = await fetch("/api/gmail/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
          })

          if (response.ok) {
            const { access_token } = await response.json()
            localStorage.setItem("gmail_access_token", access_token)

            // Close popup and notify parent
            if (window.opener) {
              window.opener.postMessage({ type: "gmail_auth_success" }, "*")
            }
            window.close()
          } else {
            console.error("[v0] Failed to exchange code for token")
            window.close()
          }
        }
      } catch (error) {
        console.error("[v0] Gmail callback error:", error)
        window.close()
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Connecting to Gmail...</p>
      </div>
    </div>
  )
}
