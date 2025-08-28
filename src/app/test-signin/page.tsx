import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github } from "lucide-react"
import Link from "next/link"

export default function TestSignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Github className="w-12 h-12 mx-auto mb-4" />
          <CardTitle>Test GitHub Sign-In</CardTitle>
          <CardDescription>
            Click the link below to test the authentication flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild className="w-full">
            <a href="/api/auth/signin/github">
              <Github className="w-4 h-4 mr-2" />
              Sign in with GitHub (Direct Link)
            </a>
          </Button>
          
          <div className="text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 underline">
              ← Back to Home
            </Link>
          </div>
          
          <div className="text-xs text-gray-600 space-y-2">
            <p><strong>Expected behavior:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click the button above</li>
              <li>You should be redirected to GitHub</li>
              <li>Authorize the application</li>
              <li>Get redirected back to the app</li>
            </ol>
            
            <p className="mt-4"><strong>If it doesn't work:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your GitHub OAuth app callback URL</li>
              <li>Make sure it's: <code className="bg-gray-100 px-1 rounded">http://localhost:3000/api/auth/callback/github</code></li>
              <li>Clear browser cache and try again</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
