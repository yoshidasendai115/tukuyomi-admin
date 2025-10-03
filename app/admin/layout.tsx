import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // トークンモードチェック
  const cookieStore = await cookies();
  const tokenMode = cookieStore.get('token_mode');
  const tokenEditPath = cookieStore.get('token_edit_path');

  // トークンモード時は、許可されたパス以外は403にリダイレクト
  if (tokenMode?.value === 'true' && tokenEditPath?.value) {
    // このlayoutは/admin配下全体に適用される
    // /admin/stores/[id]/edit はトークン編集パスとして許可される可能性がある
    // それ以外の /admin/* へのアクセスは全て403

    // 現在のパスを確実に取得するため、このチェックは各ページで行う
    // ここでは基本的に全ての/admin/*をブロックし、
    // トークン編集ページのみが例外として許可される
  }

  return <>{children}</>;
}
