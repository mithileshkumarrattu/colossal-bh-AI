import type { ToxicityAnalysis } from "./types"

export class GeminiAIService {
  private apiKey = "AIzaSyAjDuzhbSUfvKt7EjGknx5SqedcS9E_rQk"
  private endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent"

  async analyzeToxicity(text: string, context: string): Promise<ToxicityAnalysis> {
    try {
      console.log("[v0] Starting AI analysis for message:", text.substring(0, 50) + "...")

      const prompt = `You are an expert content moderation AI. Analyze this message for toxicity, harassment, and harmful content in a ${context} context.

IMPORTANT: Be consistent and thorough. Every message must be analyzed.

Message to analyze: "${text}"

Context: ${context} (adjust sensitivity accordingly - workplace/educational should be stricter than social/family)

Rate the message on these criteria:
1. Toxicity Score: 0.0 (completely safe) to 1.0 (extremely toxic)
2. Flagged: true if ANY harmful content is detected
3. Categories: Include ALL applicable categories from: harassment, hate, threats, violence, self-harm, bullying, profanity, discrimination
4. Severity: low (0.0-0.3), medium (0.3-0.6), high (0.6-0.8), critical (0.8-1.0)
5. Confidence: How certain you are (0.0-1.0)

Consider these as toxic/harmful:
- Personal attacks, insults, name-calling
- Threats of any kind (physical, emotional, professional)
- Discriminatory language based on race, gender, religion, etc.
- Bullying, intimidation, harassment
- Profanity in professional contexts
- Sexual harassment or inappropriate content
- Hate speech or discriminatory remarks

Respond ONLY in this exact JSON format:
{
  "toxicityScore": 0.0,
  "flagged": false,
  "categories": [],
  "severity": "low",
  "confidence": 0.0,
  "explanation": "",
  "recommendations": [],
  "riskLevel": 0.0
}`

      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more consistent results
            topK: 16,
            topP: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) {
        console.error("[v0] Gemini API error:", response.status)
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

      console.log("[v0] Raw AI response:", resultText.substring(0, 200) + "...")

      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])

          const result = {
            toxicityScore: Math.max(0, Math.min(1, parsed.toxicityScore || 0)),
            flagged: Boolean(parsed.flagged || parsed.toxicityScore > 0.2), // Lower threshold for flagging
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            severity: this.normalizeSeverity(parsed.severity, parsed.toxicityScore),
            confidence: Math.max(0.5, Math.min(1, parsed.confidence || 0.8)), // Minimum confidence
            explanation: parsed.explanation || "Content analyzed for potential harm",
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            riskLevel: Math.max(0, Math.min(1, parsed.riskLevel || parsed.toxicityScore || 0)),
          }

          console.log("[v0] Parsed AI result:", result)
          return result
        }
      } catch (parseError) {
        console.warn("[v0] Failed to parse AI response, using enhanced fallback analysis")
      }

      const fallbackResult = this.enhancedFallbackAnalysis(text, context)
      console.log("[v0] Using fallback analysis:", fallbackResult)
      return fallbackResult
    } catch (error) {
      console.error("[v0] AI analysis error:", error)

      const errorFallback = this.enhancedFallbackAnalysis(text, context)
      console.log("[v0] Using error fallback analysis:", errorFallback)
      return errorFallback
    }
  }

  async analyzeMessage(text: string, context: string): Promise<ToxicityAnalysis> {
    try {
      console.log("[v0] Starting enhanced email analysis for:", text.substring(0, 50) + "...")

      // Special handling for email body content
      if (context === "email_body") {
        return this.analyzeEmailBody(text)
      }

      const prompt = `You are an expert email security AI. Analyze this email content for phishing, scams, harassment, and threats.

IMPORTANT: Focus on detecting:
1. Phishing attempts (fake urgent payment requests, account suspensions)
2. Scam patterns (urgent action required, threatening consequences)
3. Social engineering (impersonation, false urgency)
4. Harassment and threats
5. Suspicious sender behavior

Email content to analyze: "${text}"

Context: ${context}

Rate the email on these criteria:
1. Toxicity Score: 0.0 (completely safe) to 1.0 (extremely dangerous)
2. Flagged: true if ANY suspicious content is detected
3. Categories: Include ALL applicable from: phishing, scam, harassment, threats, violence, impersonation, fraud, spam
4. Severity: low (0.0-0.3), medium (0.3-0.6), high (0.6-0.8), critical (0.8-1.0)
5. Confidence: How certain you are (0.0-1.0)

PHISHING/SCAM INDICATORS (HIGH PRIORITY):
- Urgent payment demands
- Account suspension threats
- "Act immediately" language
- Suspicious sender domains
- Generic greetings with personal info
- Threatening consequences for inaction
- Requests for sensitive information

Respond ONLY in this exact JSON format:
{
  "toxicityScore": 0.0,
  "flagged": false,
  "categories": [],
  "severity": "low",
  "confidence": 0.0,
  "explanation": "",
  "recommendations": [],
  "riskLevel": 0.0
}`

      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 16,
            topP: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      })

      if (!response.ok) {
        console.error("[v0] Gemini API error:", response.status)
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

      console.log("[v0] Raw AI response:", resultText.substring(0, 200) + "...")

      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])

          const result = {
            toxicityScore: Math.max(0, Math.min(1, parsed.toxicityScore || 0)),
            flagged: Boolean(parsed.flagged || parsed.toxicityScore > 0.2),
            categories: Array.isArray(parsed.categories) ? parsed.categories : [],
            severity: this.normalizeSeverity(parsed.severity, parsed.toxicityScore),
            confidence: Math.max(0.5, Math.min(1, parsed.confidence || 0.8)),
            explanation: parsed.explanation || "Content analyzed for potential threats",
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            riskLevel: Math.max(0, Math.min(1, parsed.riskLevel || parsed.toxicityScore || 0)),
          }

          console.log("[v0] Parsed AI result:", result)
          return result
        }
      } catch (parseError) {
        console.warn("[v0] Failed to parse AI response, using enhanced fallback analysis")
      }

      const fallbackResult = this.enhancedEmailAnalysis(text, context)
      console.log("[v0] Using fallback analysis:", fallbackResult)
      return fallbackResult
    } catch (error) {
      console.error("[v0] AI analysis error:", error)

      const errorFallback = this.enhancedEmailAnalysis(text, context)
      console.log("[v0] Using error fallback analysis:", errorFallback)
      return errorFallback
    }
  }

  private async analyzeEmailBody(bodyText: string): Promise<ToxicityAnalysis> {
    const lowerText = bodyText.toLowerCase()
    let score = 0.0
    const categories: string[] = []
    let explanation = ""

    // Enhanced phishing/scam detection patterns
    const phishingPatterns = [
      { pattern: /account.*suspend/i, score: 0.8, category: "phishing" },
      { pattern: /urgent.*payment/i, score: 0.7, category: "scam" },
      { pattern: /pay.*immediately/i, score: 0.8, category: "scam" },
      { pattern: /suspension.*few hours/i, score: 0.9, category: "phishing" },
      { pattern: /due amount.*immediately/i, score: 0.8, category: "scam" },
      { pattern: /avoid.*suspension/i, score: 0.7, category: "phishing" },
      { pattern: /billing.*details/i, score: 0.6, category: "phishing" },
      { pattern: /click.*here.*verify/i, score: 0.9, category: "phishing" },
      { pattern: /update.*payment.*method/i, score: 0.7, category: "scam" },
      { pattern: /verify.*account.*now/i, score: 0.8, category: "phishing" },
    ]

    // Threat and harassment patterns
    const threatPatterns = [
      { pattern: /kill.*you/i, score: 0.9, category: "threats" },
      { pattern: /hurt.*you/i, score: 0.8, category: "threats" },
      { pattern: /destroy.*you/i, score: 0.8, category: "threats" },
      { pattern: /fucking.*idiot/i, score: 0.7, category: "harassment" },
      { pattern: /piece.*of.*shit/i, score: 0.8, category: "harassment" },
    ]

    // Check for phishing/scam patterns
    phishingPatterns.forEach(({ pattern, score: patternScore, category }) => {
      if (pattern.test(bodyText)) {
        score = Math.max(score, patternScore)
        if (!categories.includes(category)) categories.push(category)
        explanation += `Detected ${category} pattern. `
      }
    })

    // Check for threat patterns
    threatPatterns.forEach(({ pattern, score: patternScore, category }) => {
      if (pattern.test(bodyText)) {
        score = Math.max(score, patternScore)
        if (!categories.includes(category)) categories.push(category)
        explanation += `Detected ${category} pattern. `
      }
    })

    // Additional scam indicators
    if (lowerText.includes("fibernet") && lowerText.includes("suspension")) {
      score = Math.max(score, 0.8)
      if (!categories.includes("phishing")) categories.push("phishing")
      explanation += "Detected telecom service suspension scam pattern. "
    }

    // Generic urgent action patterns
    const urgentWords = ["immediately", "urgent", "asap", "right now", "within hours"]
    const paymentWords = ["payment", "pay", "bill", "due", "amount", "charge"]

    let urgentCount = 0
    let paymentCount = 0

    urgentWords.forEach((word) => {
      if (lowerText.includes(word)) urgentCount++
    })

    paymentWords.forEach((word) => {
      if (lowerText.includes(word)) paymentCount++
    })

    if (urgentCount >= 2 && paymentCount >= 2) {
      score = Math.max(score, 0.7)
      if (!categories.includes("scam")) categories.push("scam")
      explanation += "Multiple urgent payment indicators detected. "
    }

    const flagged = score > 0.3 || categories.length > 0

    if (!explanation) {
      explanation = flagged
        ? `Email body contains suspicious content with ${(score * 100).toFixed(1)}% risk score.`
        : "Email body appears safe based on content analysis."
    }

    return {
      toxicityScore: score,
      flagged,
      categories,
      severity: this.getSeverity(score),
      confidence: 0.9, // High confidence for pattern-based detection
      explanation: explanation.trim(),
      recommendations: flagged
        ? ["Do not click any links", "Verify sender through official channels", "Report as phishing/spam"]
        : [],
      riskLevel: score,
    }
  }

  private enhancedFallbackAnalysis(text: string, context: string): ToxicityAnalysis {
    const lowerText = text.toLowerCase()
    let score = 0.0
    const categories: string[] = []

    // Enhanced email-specific threat detection
    const emailThreats = [
      // Phishing patterns
      { words: ["account", "suspend"], score: 0.8, category: "phishing" },
      { words: ["payment", "immediately"], score: 0.7, category: "scam" },
      { words: ["verify", "account", "now"], score: 0.8, category: "phishing" },
      { words: ["click", "here", "verify"], score: 0.9, category: "phishing" },
      { words: ["urgent", "action", "required"], score: 0.7, category: "scam" },

      // Harassment and threats
      { words: ["kill", "you"], score: 0.9, category: "threats" },
      { words: ["fucking", "idiot"], score: 0.7, category: "harassment" },
      { words: ["piece", "shit"], score: 0.8, category: "harassment" },
    ]

    // Check for email threat patterns
    emailThreats.forEach(({ words, score: threatScore, category }) => {
      if (words.every((word) => lowerText.includes(word))) {
        score = Math.max(score, threatScore)
        if (!categories.includes(category)) categories.push(category)
      }
    })

    // Profanity and offensive language
    const profanityWords = ["fuck", "shit", "damn", "bitch", "asshole", "bastard", "crap"]
    const strongProfanity = ["fucking", "motherfucker", "cocksucker"]

    // Harassment and bullying terms
    const harassmentWords = ["stupid", "idiot", "moron", "loser", "pathetic", "worthless", "useless"]
    const strongHarassment = ["kill yourself", "die", "hate you", "disgusting", "piece of shit"]

    // Threats and violence
    const threatWords = ["kill", "murder", "hurt", "harm", "destroy", "beat up", "punch"]
    const violenceWords = ["violence", "attack", "assault", "fight", "war"]

    // Hate speech indicators
    const hateWords = ["racist", "sexist", "homophobic", "transphobic", "nazi", "terrorist"]

    // Check for different types of harmful content
    profanityWords.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.2
        if (!categories.includes("profanity")) categories.push("profanity")
      }
    })

    strongProfanity.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.4
        if (!categories.includes("profanity")) categories.push("profanity")
      }
    })

    harassmentWords.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.3
        if (!categories.includes("harassment")) categories.push("harassment")
        if (!categories.includes("bullying")) categories.push("bullying")
      }
    })

    strongHarassment.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.6
        if (!categories.includes("harassment")) categories.push("harassment")
        if (!categories.includes("threats")) categories.push("threats")
      }
    })

    threatWords.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.5
        if (!categories.includes("threats")) categories.push("threats")
        if (!categories.includes("violence")) categories.push("violence")
      }
    })

    violenceWords.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.4
        if (!categories.includes("violence")) categories.push("violence")
      }
    })

    hateWords.forEach((word) => {
      if (lowerText.includes(word)) {
        score += 0.7
        if (!categories.includes("hate")) categories.push("hate")
        if (!categories.includes("discrimination")) categories.push("discrimination")
      }
    })

    // Context-based adjustments
    if (context === "workplace" || context === "educational") {
      score *= 1.2 // More strict in professional/educational settings
    } else if (context === "family") {
      score *= 0.8 // Slightly more lenient in family context
    }

    // Cap the score at 1.0
    score = Math.min(1.0, score)

    const flagged = score > 0.2 || categories.length > 0

    return {
      toxicityScore: score,
      flagged,
      categories,
      severity: this.getSeverity(score),
      confidence: 0.7, // Reasonable confidence for rule-based analysis
      explanation: flagged
        ? `Message contains potentially harmful content: ${categories.join(", ")}`
        : "Message appears to be safe based on content analysis",
      recommendations: flagged
        ? ["Consider rephrasing with more respectful language", "Review community guidelines"]
        : [],
      riskLevel: score,
    }
  }

  private enhancedEmailAnalysis(text: string, context: string): ToxicityAnalysis {
    const lowerText = text.toLowerCase()
    let score = 0.0
    const categories: string[] = []

    // Enhanced email-specific threat detection
    const emailThreats = [
      // Phishing patterns
      { words: ["account", "suspend"], score: 0.8, category: "phishing" },
      { words: ["payment", "immediately"], score: 0.7, category: "scam" },
      { words: ["verify", "account", "now"], score: 0.8, category: "phishing" },
      { words: ["click", "here", "verify"], score: 0.9, category: "phishing" },
      { words: ["urgent", "action", "required"], score: 0.7, category: "scam" },

      // Harassment and threats
      { words: ["kill", "you"], score: 0.9, category: "threats" },
      { words: ["fucking", "idiot"], score: 0.7, category: "harassment" },
      { words: ["piece", "shit"], score: 0.8, category: "harassment" },
    ]

    // Check for email threat patterns
    emailThreats.forEach(({ words, score: threatScore, category }) => {
      if (words.every((word) => lowerText.includes(word))) {
        score = Math.max(score, threatScore)
        if (!categories.includes(category)) categories.push(category)
      }
    })

    // Context-based adjustments
    if (context === "workplace" || context === "educational") {
      score *= 1.2 // More strict in professional/educational settings
    } else if (context === "family") {
      score *= 0.8 // Slightly more lenient in family context
    }

    // Cap the score at 1.0
    score = Math.min(1.0, score)

    const flagged = score > 0.2 || categories.length > 0

    return {
      toxicityScore: score,
      flagged,
      categories,
      severity: this.getSeverity(score),
      confidence: 0.8,
      explanation: flagged
        ? `Email contains potentially harmful content: ${categories.join(", ")}. Risk score: ${(score * 100).toFixed(1)}%`
        : "Email appears to be safe based on content analysis",
      recommendations: flagged
        ? ["Verify sender authenticity", "Do not click suspicious links", "Report if confirmed threat"]
        : [],
      riskLevel: score,
    }
  }

  private normalizeSeverity(severity: string, score: number): "low" | "medium" | "high" | "critical" {
    // Use score as backup if severity is invalid
    if (!severity || !["low", "medium", "high", "critical"].includes(severity)) {
      return this.getSeverity(score)
    }
    return severity as "low" | "medium" | "high" | "critical"
  }

  async generateSuggestions(originalText: string, context: string, toxicityScore: number): Promise<string[]> {
    try {
      const prompt = `The following message has a toxicity score of ${toxicityScore.toFixed(2)} in a ${context} context:

"${originalText}"

Please provide 3 alternative ways to express the same message more appropriately for a ${context} setting. Focus on:
1. Maintaining the core message intent
2. Using respectful language
3. Being constructive rather than destructive

Format as a simple list without numbers or bullets.`

      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 512,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

      // Parse suggestions from response
      const suggestions = resultText
        .split("\n")
        .filter((line) => line.trim().length > 0)
        .map((line) => line.replace(/^[\d\-*•]\s*/, "").trim())
        .filter((line) => line.length > 10)
        .slice(0, 3)

      return suggestions.length > 0
        ? suggestions
        : [
            "Consider rephrasing with more respectful language",
            "Focus on the issue rather than personal attributes",
            "Use 'I' statements to express your perspective",
          ]
    } catch (error) {
      console.error("Suggestion generation error:", error)
      return [
        "Consider using more respectful language",
        "Think about how your message might affect others",
        "Review community guidelines before posting",
      ]
    }
  }

  async detectEmotionalState(text: string): Promise<{
    emotion: string
    intensity: number
    suggestions: string[]
  }> {
    try {
      const prompt = `Analyze the emotional state of this message:

"${text}"

Identify:
1. Primary emotion (anger, frustration, sadness, joy, neutral, etc.)
2. Intensity level (0.0 to 1.0)
3. Brief suggestions for emotional regulation if needed

Respond in JSON format:
{
  "emotion": "emotion_name",
  "intensity": 0.0,
  "suggestions": ["suggestion1", "suggestion2"]
}`

      const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 256,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || ""

      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return {
            emotion: parsed.emotion || "neutral",
            intensity: parsed.intensity || 0.5,
            suggestions: parsed.suggestions || [],
          }
        }
      } catch (parseError) {
        console.warn("Failed to parse emotion analysis")
      }

      // Fallback analysis
      const lowerText = text.toLowerCase()
      let emotion = "neutral"
      let intensity = 0.3

      if (lowerText.includes("angry") || lowerText.includes("mad") || lowerText.includes("furious")) {
        emotion = "anger"
        intensity = 0.8
      } else if (lowerText.includes("sad") || lowerText.includes("depressed") || lowerText.includes("upset")) {
        emotion = "sadness"
        intensity = 0.7
      } else if (lowerText.includes("happy") || lowerText.includes("excited") || lowerText.includes("great")) {
        emotion = "joy"
        intensity = 0.6
      } else if (lowerText.includes("frustrated") || lowerText.includes("annoyed")) {
        emotion = "frustration"
        intensity = 0.6
      }

      return {
        emotion,
        intensity,
        suggestions:
          intensity > 0.6
            ? [
                "Take a moment to breathe before responding",
                "Consider the other person's perspective",
                "Focus on finding solutions rather than blame",
              ]
            : [],
      }
    } catch (error) {
      console.error("Emotional analysis error:", error)
      return {
        emotion: "neutral",
        intensity: 0.3,
        suggestions: [],
      }
    }
  }

  private getSeverity(score: number): "low" | "medium" | "high" | "critical" {
    if (score >= 0.8) return "critical"
    if (score >= 0.6) return "high"
    if (score >= 0.3) return "medium"
    return "low"
  }

  async getSuggestions(text: string): Promise<string[]> {
    return [
      "Consider using more respectful language",
      "Think about how your message might affect others",
      "Review community guidelines before posting",
    ]
  }
}

export const aiService = new GeminiAIService()
