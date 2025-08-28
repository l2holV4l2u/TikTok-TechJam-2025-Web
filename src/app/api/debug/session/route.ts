import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    console.log("Debug session:", {
      user: session?.user,
      hasAccessToken: !!session?.accessToken,
      accessTokenPreview: session?.accessToken ? `${session.accessToken.slice(0, 8)}...` : null
    })
    
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user || null,
      hasAccessToken: !!session?.accessToken,
      accessTokenPreview: session?.accessToken ? `${session.accessToken.slice(0, 8)}...` : null
    })
  } catch (error) {
    console.error("Debug session error:", error)
    return NextResponse.json({ 
      error: "Failed to check session",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
