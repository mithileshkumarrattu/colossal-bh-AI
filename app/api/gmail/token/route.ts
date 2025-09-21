import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Authorization code required" }, { status: 400 })
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: "254098038770-7k0rhv8mel2p3mromapa4b6q5v4cv05u.apps.googleusercontent.com",
        client_secret: "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",
        code,
        grant_type: "authorization_code",
        redirect_uri: "https://v0-final-pi-dun.vercel.app/gmail-callback",
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error("[v0] Token exchange failed:", error)
      return NextResponse.json({ error: "Token exchange failed" }, { status: 400 })
    }

    const tokenData = await tokenResponse.json()

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    })
  } catch (error) {
    console.error("[v0] Gmail token API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
