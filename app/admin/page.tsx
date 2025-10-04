import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function AdminPage() {
  // セッション確認
  const session = await getSession();

  if (!session) {
    redirect('/admin/login');
  }

  // store_ownerロールの場合は自分の店舗編集ページへ
  if (session.role === 'store_owner') {
    if (session.assignedStoreId) {
      redirect(`/admin/stores/${session.assignedStoreId}/edit`);
    } else {
      redirect('/admin/unauthorized');
    }
  }

  // システム管理者は/admin/dashboardにリダイレクト
  redirect('/admin/dashboard');
}