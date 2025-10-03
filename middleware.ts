import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開ページ（認証不要）
  const publicPaths = [
    '/admin/login',
    '/admin/unauthorized',
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

    // store_ownerロールの場合、アクセス制限
    if (session.role === 'store_owner') {
      const assignedStoreId = session.assignedStoreId;

      if (!assignedStoreId) {
        // 店舗IDが未設定の場合はエラー
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }

      // 許可されたパス
      const allowedPaths = [
        `/admin/stores/${assignedStoreId}/edit`,
        '/admin/logout',
        '/api/stores/' + assignedStoreId,
        '/api/owner/master-data'
      ];

      const isAllowed = allowedPaths.some(path => pathname.startsWith(path));

      if (!isAllowed) {
        console.log('[Middleware] STORE_OWNER: Blocking', {
          pathname,
          assignedStoreId,
          allowedPaths
        });
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }
    }

    // 認証済みの場合はアクセスを許可
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 全てのパスにマッチ（静的ファイル以外）
     * トークンモードチェックを最優先で行うため
     */
    '/((?!_next/static|_next/image).*)',
  ],
};