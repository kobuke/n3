import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname
    const staffSecret = request.cookies.get('nanjo_staff_secret')?.value

    // Protected Routes for Staff
    // Exclude /staff/login from check (but redirect if already logged in)
    if (path.startsWith('/staff') && path !== '/staff/login') {
        // Check if secret matches env (basic check)
        // Note: Middleware doesn't have access to env vars in some setups without careful config, 
        // but usually process.env works in Next.js middleware (except edge runtime limitations).
        // Here we just check cookie existence for speed, validation happens in API/Page if needed.

        if (!staffSecret) {
            return NextResponse.redirect(new URL('/staff/login', request.url))
        }
    }

    // If already logged in and visiting login page
    if (path === '/staff/login' && staffSecret) {
        return NextResponse.redirect(new URL('/staff/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/staff/:path*'],
}
