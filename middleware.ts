import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // デバッグ：全リクエストをログ出力
  console.log('[Middleware] START:', pathname);

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
    console.log('[Middleware] Public path, skipping auth:', pathname);
    return NextResponse.next();
  }

  // 管理画面へのアクセスは認証が必要
  if (pathname.startsWith('/admin')) {
    console.log('[Middleware] Admin path detected, verifying session:', pathname);
    const session = await verifySession(request);

    // デバッグ：すべてのリクエストでセッション情報をログ出力
    console.log('[Middleware] Request:', {
      pathname,
      hasSession: !!session,
      role: session?.role,
      userId: session?.userId,
      assignedStoreId: session?.assignedStoreId,
      allowedUrl: session?.allowedUrl
    });

    if (!session) {
      // 未認証の場合はログインページへリダイレクト
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    // /admin/storesへの直接アクセスを最優先でブロック（store_ownerの場合）
    if (pathname === '/admin/stores' || pathname.startsWith('/admin/stores?')) {
      if (session.role === 'store_owner') {
        const allowedUrl = session.allowedUrl || `/admin/stores/${session.assignedStoreId}/edit`;
        console.log('[Middleware] BLOCKING /admin/stores for store_owner');
        const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('return', allowedUrl);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    // 店舗詳細ページ（/admin/stores/{uuid}）へのアクセスをブロック（store_ownerの場合）
    // UUIDパターン: 8-4-4-4-12の形式
    const storeDetailPattern = /^\/admin\/stores\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
    const storeDetailMatch = pathname.match(storeDetailPattern);
    if (storeDetailMatch && session.role === 'store_owner') {
      const allowedUrl = session.allowedUrl || `/admin/stores/${session.assignedStoreId}/edit`;
      console.log('[Middleware] BLOCKING store detail page for store_owner:', {
        pathname,
        detectedUuid: storeDetailMatch[1]
      });
      const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
      unauthorizedUrl.searchParams.set('return', allowedUrl);
      return NextResponse.redirect(unauthorizedUrl);
    }

    // store_ownerロールの場合、アクセス制限
    if (session.role === 'store_owner') {
      const assignedStoreId = session.assignedStoreId;
      const allowedUrl = session.allowedUrl;

      if (!assignedStoreId || !allowedUrl) {
        // 店舗IDまたは許可URLが未設定の場合はエラー
        console.log('[Middleware] STORE_OWNER: Missing assignedStoreId or allowedUrl', {
          pathname,
          assignedStoreId,
          allowedUrl
        });
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }

      // リクエストヘッダーから許可URLを取得
      const headerAllowedUrl = request.headers.get('X-Allowed-URL');

      // API/静的リソースの許可パス
      const apiAllowedPaths = [
        '/api/stores/' + assignedStoreId,
        '/api/owner/master-data',
        '/api/auth/session',
        '/api/auth/logout',
        '/api/masters/data',
        '/api/admin/broadcast-message',
        '/api/admin/favorite-count',
        '/_next',
        '/favicon.ico'
      ];

      // 明示的にブロックするパス（システム管理者専用）
      const blockedPaths = [
        '/admin/dashboard',
        '/admin/stores',
        '/admin/logs',
        '/admin/users',
        '/admin/genres',
        '/admin/requests',
        '/admin/notifications',
        '/admin/masters',
        '/admin/station-groups'
      ];

      // ブロックパスに該当する場合は即座に拒否（完全一致チェック）
      const isBlockedExact = blockedPaths.some(path => {
        // /admin/storesは/admin/stores/{id}/editと区別するため完全一致または/admin/stores?...のみブロック
        if (path === '/admin/stores') {
          return pathname === '/admin/stores' || pathname.startsWith('/admin/stores?');
        }
        return pathname.startsWith(path);
      });

      if (isBlockedExact) {
        console.log('[Middleware] STORE_OWNER: Blocked (admin area)', {
          pathname,
          assignedStoreId
        });
        const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('return', allowedUrl);
        return NextResponse.redirect(unauthorizedUrl);
      }

      // API/静的リソースの場合は許可
      const isApiAllowed = apiAllowedPaths.some(path => pathname.startsWith(path));
      if (isApiAllowed) {
        return NextResponse.next();
      }

      // ページアクセスの場合、allowedUrlまたはその配下のみ許可
      const isPageAllowed = pathname.startsWith(allowedUrl);

      if (!isPageAllowed) {
        console.log('[Middleware] STORE_OWNER: Blocked (not allowed URL)', {
          pathname,
          allowedUrl,
          assignedStoreId,
          headerAllowedUrl
        });
        const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('return', allowedUrl);
        return NextResponse.redirect(unauthorizedUrl);
      }

      // ヘッダーの許可URLとセッションの許可URLが一致するかチェック（セキュリティ強化）
      if (headerAllowedUrl && headerAllowedUrl !== allowedUrl) {
        console.log('[Middleware] STORE_OWNER: Header mismatch', {
          pathname,
          sessionAllowedUrl: allowedUrl,
          headerAllowedUrl
        });
        const unauthorizedUrl = new URL('/admin/unauthorized', request.url);
        unauthorizedUrl.searchParams.set('return', allowedUrl);
        return NextResponse.redirect(unauthorizedUrl);
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
     * 管理画面のパスに明示的にマッチ
     * 静的ファイルとAPI routes、画像を除外
     */
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};