import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

export default function AuthDebugPage() {
  const envChecks = [
    { name: "GITHUB_ID", value: process.env.GITHUB_ID, required: true },
    { name: "GITHUB_SECRET", value: process.env.GITHUB_SECRET, required: true },
    { name: "NEXTAUTH_SECRET", value: process.env.NEXTAUTH_SECRET, required: true },
    { name: "NEXTAUTH_URL", value: process.env.NEXTAUTH_URL, required: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Authentication Debug
          </h1>
          <p className="text-gray-600">
            This page helps diagnose authentication configuration issues.
          </p>
        </div>

        {/* Environment Variables */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>
              Check if all required environment variables are set
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {envChecks.map((check) => (
                <div key={check.name} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center gap-3">
                    {check.value ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className="font-medium">{check.name}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {check.value ? (
                      <span className="text-green-600">
                        {check.name.includes('SECRET') 
                          ? '✓ Set (hidden)' 
                          : check.value.substring(0, 10) + '...'
                        }
                      </span>
                    ) : (
                      <span className="text-red-600">Not set</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* OAuth Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>GitHub OAuth App Configuration</CardTitle>
            <CardDescription>
              Verify your GitHub OAuth app is configured correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <h3 className="font-medium text-blue-900 mb-2">Required Callback URL</h3>
                <code className="text-sm bg-blue-100 px-2 py-1 rounded">
                  http://localhost:3000/api/auth/callback/github
                </code>
                <p className="text-sm text-blue-800 mt-2">
                  This must be set exactly in your GitHub OAuth app settings.
                </p>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h3 className="font-medium text-yellow-900 mb-2">Required Scopes</h3>
                <p className="text-sm text-yellow-800">
                  The app will request: <code className="bg-yellow-100 px-1 rounded">read:user repo</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Links */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Authentication</CardTitle>
            <CardDescription>
              Direct links to test different parts of the auth flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button asChild variant="outline">
                  <a href="/api/auth/signin/github" target="_blank" rel="noopener noreferrer">
                    Direct GitHub Sign-in
                  </a>
                </Button>
                
                <Button asChild variant="outline">
                  <a href="/api/auth/session" target="_blank" rel="noopener noreferrer">
                    Check Session
                  </a>
                </Button>
                
                <Button asChild variant="outline">
                  <a href="/api/auth/providers" target="_blank" rel="noopener noreferrer">
                    Check Providers
                  </a>
                </Button>
                
                <Button asChild variant="outline">
                  <Link href="/">
                    Back to Home
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Common Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Common Issues</CardTitle>
            <CardDescription>
              Check these if login is not working
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Callback URL Mismatch</h4>
                  <p className="text-sm text-gray-600">
                    Make sure your GitHub OAuth app callback URL is exactly: 
                    <code className="bg-gray-100 px-1 rounded ml-1">http://localhost:3000/api/auth/callback/github</code>
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">App Authorization</h4>
                  <p className="text-sm text-gray-600">
                    If your OAuth app is owned by an organization, make sure it's approved for use.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium">Browser Cache</h4>
                  <p className="text-sm text-gray-600">
                    Try clearing browser cache or using an incognito window.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
