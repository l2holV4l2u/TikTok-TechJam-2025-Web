"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

export function SignInButton() {
  const handleSignIn = async () => {
    try {
      await signIn("github", { 
        callbackUrl: "/dashboard",
        redirect: true 
      })
    } catch (error) {
      console.error("Sign in error:", error)
    }
  }

  return (
    <Button onClick={handleSignIn} size="lg" className="gap-2">
      <Github className="w-5 h-5" />
      Sign in with GitHub
    </Button>
  )
}
