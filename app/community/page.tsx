"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { firebaseService } from "@/lib/firebase-service"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Plus,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Edit,
  Trash2,
  Search,
  Users,
  TrendingUp,
  Shield,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface CommunityPost {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  category: "experience" | "support" | "awareness" | "resources"
  tags: string[]
  likes: string[] // Array of user IDs who liked
  comments: CommunityComment[]
  createdAt: Date
  updatedAt: Date
  isAnonymous: boolean
  severity?: "low" | "medium" | "high"
}

interface CommunityComment {
  id: string
  postId: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  createdAt: Date
  likes: string[]
  isAnonymous: boolean
}

export default function CommunityPage() {
  return (
    <ProtectedRoute>
      <CommunityContent />
    </ProtectedRoute>
  )
}

function CommunityContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<CommunityPost | null>(null)

  // New post form state
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "experience" as CommunityPost["category"],
    tags: "",
    isAnonymous: false,
    severity: "low" as CommunityPost["severity"],
  })

  // Comment state
  const [commentingPost, setCommentingPost] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    loadCommunityPosts()
  }, [authLoading, user])

  const loadCommunityPosts = async () => {
    try {
      setLoading(true)
      const communityPosts = await firebaseService.getCommunityPosts()
      setPosts(communityPosts)
    } catch (error) {
      console.error("[v0] Failed to load community posts:", error)
      const mockPosts: CommunityPost[] = [
        {
          id: "1",
          title: "My Experience with Workplace Harassment Detection",
          content:
            "I wanted to share how the AI detection system helped me identify subtle harassment patterns in my workplace communications. The system caught things I initially dismissed as 'just jokes' but were actually creating a hostile environment.",
          authorId: "user1",
          authorName: "Sarah M.",
          category: "experience",
          tags: ["workplace", "detection", "patterns"],
          likes: ["user2", "user3"],
          comments: [
            {
              id: "c1",
              postId: "1",
              content: "Thank you for sharing this. It's so important to recognize these patterns early.",
              authorId: "user2",
              authorName: "Alex K.",
              createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              likes: ["user1"],
              isAnonymous: false,
            },
          ],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          isAnonymous: false,
          severity: "medium",
        },
        {
          id: "2",
          title: "Resources for Supporting Harassment Victims",
          content:
            "I've compiled a list of resources that have been helpful for people dealing with harassment. These include counseling services, legal aid, and support groups.",
          authorId: "user2",
          authorName: "Anonymous",
          category: "resources",
          tags: ["support", "resources", "help"],
          likes: [user?.id || "user1", "user3", "user4"],
          comments: [],
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          isAnonymous: true,
          severity: "low",
        },
        {
          id: "3",
          title: "How AI Detection Changed My Online Safety",
          content:
            "The real-time monitoring feature has been a game-changer for my online interactions. I feel more confident participating in discussions knowing that harmful content is being flagged immediately.",
          authorId: "user3",
          authorName: "Jordan P.",
          category: "experience",
          tags: ["online-safety", "confidence", "real-time"],
          likes: ["user1"],
          comments: [
            {
              id: "c2",
              postId: "3",
              content: "This is exactly why we built this system. So glad it's helping!",
              authorId: "user1",
              authorName: "Community Moderator",
              createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
              likes: ["user3"],
              isAnonymous: false,
            },
          ],
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          isAnonymous: false,
          severity: "low",
        },
      ]
      setPosts(mockPosts)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async () => {
    if (!user || !newPost.title.trim() || !newPost.content.trim()) {
      alert("Please fill in both title and content fields.")
      return
    }

    try {
      const postData: Omit<CommunityPost, "id" | "createdAt" | "updatedAt"> = {
        title: newPost.title.trim(),
        content: newPost.content.trim(),
        authorId: user.id,
        authorName: newPost.isAnonymous ? "Anonymous" : user.displayName || "Unknown User",
        authorAvatar: newPost.isAnonymous ? undefined : user.photoURL,
        category: newPost.category,
        tags: newPost.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        likes: [],
        comments: [],
        isAnonymous: newPost.isAnonymous,
        severity: newPost.severity,
      }

      console.log("[v0] Creating community post:", postData)
      const postId = await firebaseService.createCommunityPost(postData)
      console.log("[v0] Community post created with ID:", postId)

      const createdPost: CommunityPost = {
        ...postData,
        id: postId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      setPosts((prev) => [createdPost, ...prev])

      setNewPost({
        title: "",
        content: "",
        category: "experience",
        tags: "",
        isAnonymous: false,
        severity: "low",
      })
      setIsCreateDialogOpen(false)

      alert("Post created successfully!")
    } catch (error) {
      console.error("[v0] Failed to create post:", error)
      alert(`Failed to create post: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`)
    }
  }

  const handleLikePost = async (postId: string) => {
    if (!user) return

    try {
      const post = posts.find((p) => p.id === postId)
      if (!post) return

      const isLiked = post.likes.includes(user.id)
      const updatedLikes = isLiked ? post.likes.filter((id) => id !== user.id) : [...post.likes, user.id]

      await firebaseService.updateCommunityPostLikes(postId, updatedLikes)

      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes: updatedLikes } : p)))
    } catch (error) {
      console.error("[v0] Failed to update likes:", error)
    }
  }

  const handleAddComment = async (postId: string) => {
    if (!user || !newComment.trim()) return

    try {
      const commentData: Omit<CommunityComment, "id" | "createdAt"> = {
        postId,
        content: newComment,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatar: user.photoURL,
        likes: [],
        isAnonymous: false,
      }

      const commentId = await firebaseService.addCommunityComment(commentData)

      const createdComment: CommunityComment = {
        ...commentData,
        id: commentId,
        createdAt: new Date(),
      }

      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, createdComment] } : p)))

      setNewComment("")
      setCommentingPost(null)
    } catch (error) {
      console.error("[v0] Failed to add comment:", error)
      alert("Failed to add comment. Please try again.")
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user) return

    const post = posts.find((p) => p.id === postId)
    if (!post || post.authorId !== user.id) return

    if (!confirm("Are you sure you want to delete this post?")) return

    try {
      await firebaseService.deleteCommunityPost(postId)

      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch (error) {
      console.error("[v0] Failed to delete post:", error)
      alert("Failed to delete post. Please try again.")
    }
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === "all" || post.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "experience":
        return "bg-blue-500/20 text-blue-400"
      case "support":
        return "bg-green-500/20 text-green-400"
      case "awareness":
        return "bg-orange-500/20 text-orange-400"
      case "resources":
        return "bg-purple-500/20 text-purple-400"
      default:
        return "bg-gray-500/20 text-gray-400"
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "low":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/chats")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <img src="/favicon.ico" alt="bh-AI" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Community</h1>
              <p className="text-sm text-muted-foreground">Share experiences and support each other</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/gmail")}
              className="text-muted-foreground hover:text-foreground"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Gmail
            </Button>
            <Button onClick={() => router.push("/profile")} variant="outline" size="sm">
              <Shield className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto">
        {/* Community Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{posts.length}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{posts.reduce((sum, post) => sum + post.comments.length, 0)}</div>
                  <div className="text-sm text-muted-foreground">Comments</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold">{posts.reduce((sum, post) => sum + post.likes.length, 0)}</div>
                  <div className="text-sm text-muted-foreground">Likes</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {posts.filter((p) => p.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                  </div>
                  <div className="text-sm text-muted-foreground">This Week</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search posts, tags, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="experience">Experience</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="awareness">Awareness</SelectItem>
              <SelectItem value="resources">Resources</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Share Experience
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Share Your Experience</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="post-title">Title</Label>
                  <Input
                    id="post-title"
                    value={newPost.title}
                    onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Give your post a descriptive title..."
                  />
                </div>
                <div>
                  <Label htmlFor="post-content">Content</Label>
                  <Textarea
                    id="post-content"
                    value={newPost.content}
                    onChange={(e) => setNewPost((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Share your experience, insights, or resources..."
                    rows={6}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="post-category">Category</Label>
                    <Select
                      value={newPost.category}
                      onValueChange={(value: any) => setNewPost((prev) => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="experience">Experience</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="awareness">Awareness</SelectItem>
                        <SelectItem value="resources">Resources</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="post-severity">Severity Level</Label>
                    <Select
                      value={newPost.severity}
                      onValueChange={(value: any) => setNewPost((prev) => ({ ...prev, severity: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - General Discussion</SelectItem>
                        <SelectItem value="medium">Medium - Concerning Behavior</SelectItem>
                        <SelectItem value="high">High - Serious Incident</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="post-tags">Tags (comma-separated)</Label>
                  <Input
                    id="post-tags"
                    value={newPost.tags}
                    onChange={(e) => setNewPost((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="workplace, online-safety, support..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={newPost.isAnonymous}
                    onChange={(e) => setNewPost((prev) => ({ ...prev, isAnonymous: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="anonymous">Post anonymously</Label>
                </div>
                <Button onClick={handleCreatePost} className="w-full">
                  Share Experience
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || categoryFilter !== "all" ? "No posts found" : "No posts yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "Be the first to share your experience with the community"}
              </p>
              {!searchTerm && categoryFilter === "all" && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Share Your Experience
                </Button>
              )}
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={post.authorAvatar || "/placeholder.svg"} />
                        <AvatarFallback>
                          {post.isAnonymous ? "?" : post.authorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{post.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{post.authorName}</span>
                          <span>•</span>
                          <span>{post.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(post.category)}>{post.category}</Badge>
                      {post.severity && (
                        <Badge variant="outline" className={getSeverityColor(post.severity)}>
                          {post.severity}
                        </Badge>
                      )}
                      {post.authorId === user?.id && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditingPost(post)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeletePost(post.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 whitespace-pre-wrap">{post.content}</p>

                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikePost(post.id)}
                        className={post.likes.includes(user?.id || "") ? "text-red-500" : ""}
                      >
                        <Heart
                          className={`w-4 h-4 mr-1 ${post.likes.includes(user?.id || "") ? "fill-current" : ""}`}
                        />
                        {post.likes.length}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCommentingPost(commentingPost === post.id ? null : post.id)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.comments.length}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Comments */}
                  {post.comments.length > 0 && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.authorAvatar || "/placeholder.svg"} />
                            <AvatarFallback>
                              {comment.isAnonymous ? "?" : comment.authorName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-muted rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{comment.authorName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {comment.createdAt.toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Button variant="ghost" size="sm" className="text-xs h-6">
                                <Heart className="w-3 h-3 mr-1" />
                                {comment.likes.length}
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs h-6">
                                Reply
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  {commentingPost === post.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user?.photoURL || "/placeholder.svg"} />
                          <AvatarFallback>{user?.displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a supportive comment..."
                            rows={2}
                            className="mb-2"
                          />
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => handleAddComment(post.id)} disabled={!newComment.trim()}>
                              Comment
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setCommentingPost(null)
                                setNewComment("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
