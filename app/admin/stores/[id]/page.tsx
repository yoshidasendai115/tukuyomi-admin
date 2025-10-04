import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import StoreDetailPageClient from './StoreDetailPageClient';

export default async function StoreDetailPage() {
  // サーバーサイドで認証チェック
  const session = await getSession();

  // 未認証の場合はログインページへ
  if (!session) {
    redirect('/admin/login');
  }

  // store_ownerロールの場合は自店舗編集ページへリダイレクト
  if (session.role === 'store_owner') {
    const allowedUrl = session.allowedUrl || `/admin/stores/${session.assignedStoreId}/edit`;
    redirect(`/admin/unauthorized?return=${encodeURIComponent(allowedUrl)}`);
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    }>
      <StoreDetailPageClient />
    </Suspense>
  );
}
