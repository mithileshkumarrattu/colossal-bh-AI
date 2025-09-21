"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Settings, User, Bell, Shield, Save, RotateCcw } from "lucide-react"
import { ToxicityAnalyzer } from "@/components/toxicity-analyzer"
import { AIChatAssistant } from "@/components/ai-chat-assistant"
import { RealTimeMonitor } from "@/components/real-time-monitor"

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  )
}

function SettingsContent() {
  const { user, firebaseUser } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [displayName, setDisplayName] = useState(user?.displayName || "")
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.notificationsEnabled || false)
  const [contexts, setContexts] = useState({
    family: user?.contexts.family || 0.3,
    workplace: user?.contexts.workplace || 0.1,
    educational: user?.contexts.educational || 0.2,
    social: user?.contexts.social || 0.4,
  })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName)
      setNotificationsEnabled(user.notificationsEnabled)
      setContexts(user.contexts)
    }
  }, [user])

  const handleContextChange = (context: keyof typeof contexts, value: number[]) => {
    setContexts((prev) => ({ ...prev, [context]: value[0] }))
    setHasChanges(true)
  }

  const handleSaveChanges = async () => {
    if (!user) return

    setLoading(true)
    try {
      await firebaseService.updateUser(user.id, {
        displayName,
        notificationsEnabled,
        contexts,
      })
      setHasChanges(false)
    } catch (error) {
      console.error("Failed to save settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleResetDefaults = () => {
    setContexts({
      family: 0.3,
      workplace: 0.1,
      educational: 0.2,
      social: 0.4,
    })
    setHasChanges(true)
  }

  const getContextDescription = (context: string) => {
    switch (context) {
      case "family":
        return "Personal family conversations - moderate tolerance for casual language"
      case "workplace":
        return "Professional work communications - strict standards required"
      case "educational":
        return "Academic and learning environments - respectful discourse expected"
      case "social":
        return "Social media and casual conversations - balanced approach"
      default:
        return ""
    }
  }

  const getContextColor = (context: string) => {
    switch (context) {
      case "family":
        return "bg-green-500"
      case "workplace":
        return "bg-blue-500"
      case "educational":
        return "bg-purple-500"
      case "social":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
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
              <h1 className="text-xl font-bold text-white">Settings</h1>
              <p className="text-sm text-slate-400">Manage your account and safety preferences</p>
            </div>
          </div>
          {hasChanges && (
            <Button onClick={handleSaveChanges} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </header>

      <div className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="profile" className="text-slate-300 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-slate-300 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="contexts" className="text-slate-300 data-[state=active]:text-white">
              <Shield className="w-4 h-4 mr-2" />
              Contexts
            </TabsTrigger>
            <TabsTrigger value="tools" className="text-slate-300 data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              AI Tools
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                      {user?.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">{user?.displayName}</h3>
                    <p className="text-slate-400">{user?.email}</p>
                    <Badge variant="outline" className="text-slate-300 border-slate-600">
                      {user?.role}
                    </Badge>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="display-name" className="text-slate-300">
                      Display Name
                    </Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value)
                        setHasChanges(true)
                      }}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-slate-700 border-slate-600 text-slate-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Account Statistics</Label>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="bg-slate-700 p-3 rounded-lg">
                      <div className="text-sm text-slate-400">Member Since</div>
                      <div className="text-white font-medium">{user?.createdAt.toLocaleDateString()}</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded-lg">
                      <div className="text-sm text-slate-400">Last Active</div>
                      <div className="text-white font-medium">{user?.lastActive.toLocaleDateString()}</div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded-lg">
                      <div className="text-sm text-slate-400">Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${user?.isOnline ? "bg-green-500" : "bg-slate-500"}`} />
                        <span className="text-white font-medium">{user?.isOnline ? "Online" : "Offline"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-slate-300">Push Notifications</Label>
                    <p className="text-sm text-slate-500">Receive alerts for flagged messages and incidents</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={(checked) => {
                      setNotificationsEnabled(checked)
                      setHasChanges(true)
                    }}
                  />
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-4">
                  <Label className="text-slate-300">Notification Types</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-300">High Toxicity Alerts</div>
                        <div className="text-xs text-slate-500">Immediate alerts for critical incidents</div>
                      </div>
                      <Switch checked={notificationsEnabled} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-300">Daily Summaries</div>
                        <div className="text-xs text-slate-500">Daily reports of conversation safety</div>
                      </div>
                      <Switch checked={notificationsEnabled} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-slate-300">Weekly Reports</div>
                        <div className="text-xs text-slate-500">Comprehensive weekly analysis</div>
                      </div>
                      <Switch checked={notificationsEnabled} disabled />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contexts Tab */}
          <TabsContent value="contexts" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Context Thresholds</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetDefaults}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Defaults
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-slate-400">
                  Set toxicity thresholds for different conversation contexts. Lower values mean stricter moderation.
                </p>

                {Object.entries(contexts).map(([context, value]) => (
                  <div key={context} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getContextColor(context)}`} />
                        <div>
                          <Label className="text-slate-300 capitalize">{context}</Label>
                          <p className="text-xs text-slate-500">{getContextDescription(context)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-slate-300 border-slate-600">
                        {(value * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(newValue) => handleContextChange(context as keyof typeof contexts, newValue)}
                      max={1}
                      min={0}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Strict (0%)</span>
                      <span>Moderate (50%)</span>
                      <span>Lenient (100%)</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <ToxicityAnalyzer />
              <AIChatAssistant context="social" />
            </div>
            {user && <RealTimeMonitor userId={user.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
