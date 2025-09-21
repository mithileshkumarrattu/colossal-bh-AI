"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Download, Calendar, Search, Plus, ArrowLeft, Clock, CheckCircle, AlertCircle } from "lucide-react"
import type { Report, Chat } from "@/lib/types"

export default function ReportsPage() {
  return (
    <ProtectedRoute>
      <ReportsContent />
    </ProtectedRoute>
  )
}

function ReportsContent() {
  const { user } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string>("")
  const [scheduleFrequency, setScheduleFrequency] = useState<"weekly" | "monthly">("weekly")
  const [autoGenerate, setAutoGenerate] = useState(false)

  useEffect(() => {
    if (!user) return

    loadReportsData()
  }, [user])

  const loadReportsData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const [userReports, userChats] = await Promise.all([
        firebaseService.getUserReports(user.id),
        firebaseService.getUserChats(user.id),
      ])

      setReports(userReports)
      setChats(userChats)
    } catch (error) {
      console.error("Failed to load reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (chatId?: string) => {
    if (!user) return

    try {
      const targetChatId = chatId || selectedChatId
      if (!targetChatId) return

      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: targetChatId,
          userId: user.id,
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            end: new Date(),
          },
        }),
      })

      if (response.ok) {
        await loadReportsData()
        setIsScheduleDialogOpen(false)
        setSelectedChatId("")
      }
    } catch (error) {
      console.error("Failed to generate report:", error)
    }
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || report.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-500/20 text-green-400"
      case "pending":
        return "bg-yellow-500/20 text-yellow-400"
      default:
        return "bg-slate-500/20 text-slate-400"
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/chats")}
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Evidence Reports</h1>
              <p className="text-sm text-slate-400">Generate and manage AI-powered evidence documentation</p>
            </div>
          </div>
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle>Generate Evidence Report</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="chat-select">Select Chat</Label>
                  <Select value={selectedChatId} onValueChange={setSelectedChatId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Choose a chat to analyze" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {chats.map((chat) => (
                        <SelectItem key={chat.id} value={chat.id}>
                          {chat.title} ({chat.context})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="frequency">Report Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={(value: any) => setScheduleFrequency(value)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-generate"
                    checked={autoGenerate}
                    onCheckedChange={(checked) => setAutoGenerate(checked as boolean)}
                  />
                  <Label htmlFor="auto-generate" className="text-sm">
                    Schedule automatic report generation
                  </Label>
                </div>

                <Button
                  onClick={() => handleGenerateReport()}
                  disabled={!selectedChatId}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Generate Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="p-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reports Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">
                {searchTerm || statusFilter !== "all" ? "No reports found" : "No reports yet"}
              </h3>
              <p className="text-slate-500 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Generate your first evidence report to get started"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={() => setIsScheduleDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate First Report
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Generated Reports ({filteredReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Report Title</TableHead>
                    <TableHead className="text-slate-300">Generated</TableHead>
                    <TableHead className="text-slate-300">Incidents</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} className="border-slate-700">
                      <TableCell className="text-white font-medium">{report.title}</TableCell>
                      <TableCell className="text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {report.generatedAt.toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        <div className="space-y-1">
                          <div className="text-sm">
                            {report.metrics.flaggedCount} of {report.metrics.totalMessages}
                          </div>
                          <div className="text-xs text-slate-500">
                            Avg: {(report.metrics.averageToxicity * 100).toFixed(1)}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(report.status)}>
                          {getStatusIcon(report.status)}
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {report.status === "complete" && report.fileURL && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(report.fileURL, "_blank")}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/chat/${report.chatId}`)}
                            className="text-slate-400 hover:text-white"
                          >
                            View Chat
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
