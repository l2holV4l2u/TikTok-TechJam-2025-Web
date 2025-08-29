import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Home } from "lucide-react"

interface AuthErrorPageProps {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams
  const error = params.error

  const getErrorMessage = (error?: string) => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration. Please check that your environment variables are set correctly."
      case "AccessDenied":
        return "Access was denied. Please make sure you have authorized the application."
      case "Verification":
        return "The verification token is invalid or has expired."
      default:
        return "An unknown error occurred during authentication."
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <CardTitle className="text-red-900">Authentication Error</CardTitle>
          <CardDescription>
            There was a problem signing you in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{getErrorMessage(error)}</p>
            {error && (
              <p className="text-xs text-red-600 mt-2">Error code: {error}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Link>
            </Button>
          </div>
          
          {error === "Configuration" && (
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Common issues:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Missing GITHUB_ID or GITHUB_SECRET</li>
                <li>Missing NEXTAUTH_SECRET</li>
                <li>Incorrect NEXTAUTH_URL</li>
                <li>GitHub OAuth app not configured properly</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
