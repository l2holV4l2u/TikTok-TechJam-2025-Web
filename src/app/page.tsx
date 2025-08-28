import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Github, GitBranch, Search, Zap, AlertCircle } from "lucide-react"
import { SignInButton } from "@/components/sign-in-button"
import { DirectSignInButton } from "@/components/direct-sign-in-button"
import { redirect } from "next/navigation"

export default async function Home() {
  let session = null
  let authError: string | null = null

  try {
    session = await auth()
  } catch (error) {
    console.error("Auth error:", error)
    authError = error instanceof Error ? error.message : "Unknown authentication error"
  }

  // If user is already authenticated, redirect to dashboard
  if (session) {
    redirect("/dashboard")
  }

  // Check if environment variables are properly configured
  const isConfigured = process.env.GITHUB_ID && 
                      process.env.GITHUB_SECRET && 
                      process.env.NEXTAUTH_SECRET

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        {!isConfigured && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Configuration Required</span>
              </div>
              <p className="text-yellow-700 mb-3">
                Please set up your environment variables before using the application:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                <li>Create a GitHub OAuth app at <a href="https://github.com/settings/developers" className="underline">GitHub Developer Settings</a></li>
                <li>Set the callback URL to: <code className="bg-yellow-200 px-1 rounded">http://localhost:3000/api/auth/callback/github</code></li>
                <li>Update your <code className="bg-yellow-200 px-1 rounded">.env.local</code> file with your GitHub credentials</li>
              </ul>
            </CardContent>
          </Card>
        )}

        {authError && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-800 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Authentication Error</span>
              </div>
              <p className="text-red-700 text-sm">
                There was an error with the authentication configuration. Please check your environment variables.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Github className="w-16 h-16 text-gray-800" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            GitHub Repository Explorer
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Explore your GitHub repositories, browse files, and view code with an elegant interface.
            Sign in with your GitHub account to get started.
          </p>
          
          {isConfigured ? (
            <div className="space-y-4">
              <SignInButton />
              <div className="text-sm text-gray-500">or</div>
              <DirectSignInButton />
            </div>
          ) : (
            <Button disabled size="lg" className="gap-2">
              <Github className="w-5 h-5" />
              Configure App First
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Search className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Browse Repositories</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View all your public and private repositories with search and pagination support.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <GitBranch className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle>Explore File Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Navigate through your repository&apos;s file tree with an intuitive folder structure.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle>View Code</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Read file contents with syntax highlighting for over 30 programming languages.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Secure authentication via GitHub OAuth • No data stored • Read-only access
          </p>
          <div className="text-xs">
            <a href="/auth/debug" className="text-blue-600 hover:text-blue-800 underline">
              Debug Authentication Issues
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
