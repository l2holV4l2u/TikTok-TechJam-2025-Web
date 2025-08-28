"use client"

import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

export function DirectSignInButton() {
  const handleSignIn = () => {
    // Direct redirect to NextAuth GitHub sign-in endpoint
    window.location.href = "/api/auth/signin/github"
  }

  return (
    <Button onClick={handleSignIn} size="lg" className="gap-2">
      <Github className="w-5 h-5" />
      Sign in with GitHub (Direct)
    </Button>
  )
}
