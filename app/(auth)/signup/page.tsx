import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SignupPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <img src="/logo.webp" alt="bhlAi" className="w-10 h-10" />
          </div>
          <CardTitle className="text-2xl font-bold">Join bhlAi</CardTitle>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input type="text" name="name" id="name" className="mt-1" placeholder="Your full name" />
            </div>
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input type="email" name="email" id="email" className="mt-1" placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input type="password" name="password" id="password" className="mt-1" placeholder="Create a password" />
            </div>
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default SignupPage
