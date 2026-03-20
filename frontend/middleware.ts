// Middleware: protect /admin/* routes (except /admin/login)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow login page through
  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  // Check session cookie for all other /admin/* routes
  const sessionToken = request.cookies.get('session_token');
  if (!sessionToken?.value) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
