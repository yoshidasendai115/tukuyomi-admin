import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ページ（認証不要）
  const publicPaths = [
    '/admin/login',
    '/test-db',
    '/',
    '/_next',
    '/favicon.ico',
  ];

  // 公開ページへのアクセスは許可
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 管理画面へのアクセスは認証が必要
  if (pathname.startsWith('/admin')) {
    const session = await verifySession(request);

    if (!session) {
      // 未認証の場合はログインページへリダイレクト
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // 認証済みの場合はアクセスを許可
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};