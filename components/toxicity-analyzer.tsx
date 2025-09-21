"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, CheckCircle, Zap, Lightbulb } from "lucide-react"
import { aiService } from "@/lib/ai-service"
import type { ToxicityAnalysis } from "@/lib/types"

interface ToxicityAnalyzerProps {
  onAnalysis?: (analysis: ToxicityAnalysis) => void
  defaultContext?: "family" | "workplace" | "educational" | "social"
}

export function ToxicityAnalyzer({ onAnalysis, defaultContext = "social" }: ToxicityAnalyzerProps) {
  const [text, setText] = useState("")
  const [context, setContext] = useState(defaultContext)
  const [analysis, setAnalysis] = useState<ToxicityAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) return

    setIsAnalyzing(true)
    try {
      const result = await aiService.analyzeToxicity(text, context)
      setAnalysis(result)
      if (onAnalysis) {
        onAnalysis(result)
      }
    } catch (error) {
      console.error("Analysis failed:", error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-green-500/20 text-green-400 border-green-500/30"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return "text-red-400"
    if (score >= 0.4) return "text-orange-400"
    if (score >= 0.2) return "text-yellow-400"
    return "text-green-400"
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          Message Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Context</label>
          <Select value={context} onValueChange={(value: any) => setContext(value)}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="workplace">Workplace</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="social">Social</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-slate-300">Message to analyze</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your message here..."
            className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={!text.trim() || isAnalyzing}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Message"}
        </Button>

        {analysis && (
          <div className="space-y-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Analysis Results</h4>
              <Badge className={getSeverityColor(analysis.severity)}>{analysis.severity}</Badge>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Toxicity Score</span>
                  <span className={`text-sm font-medium ${getScoreColor(analysis.toxicityScore)}`}>
                    {(analysis.toxicityScore * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={analysis.toxicityScore * 100} className="bg-slate-700" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Confidence</span>
                  <span className="text-sm text-slate-400">{(analysis.confidence * 100).toFixed(1)}%</span>
                </div>
                <Progress value={analysis.confidence * 100} className="bg-slate-700" />
              </div>

              {analysis.flagged && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-medium text-red-400">Content Flagged</span>
                  </div>
                  {analysis.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {analysis.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs border-red-500/30 text-red-400">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!analysis.flagged && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Message appears safe</span>
                  </div>
                </div>
              )}

              {analysis.explanation && (
                <div className="bg-slate-700 rounded-lg p-3">
                  <h5 className="text-sm font-medium text-slate-300 mb-1">Explanation</h5>
                  <p className="text-sm text-slate-400">{analysis.explanation}</p>
                </div>
              )}

              {analysis.recommendations.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-blue-400">Recommendations</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-slate-300">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>{" "}
      {/* Close the CardContent tag */}
    </Card>
  )
}
