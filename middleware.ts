import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default auth((req: NextRequest & { auth: any }) => {
  const { pathname } = req.nextUrl

  // Protect dashboard and repo routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/repo')) {
    if (!req.auth) {
      const url = new URL('/', req.url)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/repo/:path*']
}
