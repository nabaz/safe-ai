import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Child routes use their own cookie-based auth, not NextAuth
        if (pathname.startsWith('/child')) return true

        // Public routes. These are allowed without a parent NextAuth session.
        // API routes that perform their own child-session checks should also be
        // listed here so the middleware doesn't redirect fetch() requests to
        // the sign-in page (which breaks client-side fetch calls).
        if (
          pathname === '/' ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/signup') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/child-session') ||
          pathname.startsWith('/api/chat') ||
          pathname.startsWith('/api/daily-challenges') ||
          pathname.startsWith('/api/code-lab') ||
          pathname.startsWith('/api/points')
        ) {
          return true
        }

        // Dashboard and parent API routes require parent session
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
