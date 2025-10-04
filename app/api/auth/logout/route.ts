import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // セッション情報を取得（ログに記録するため）
    const session = await getSession();

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // ログアウトログを記録（セッションがある場合のみ）
    if (session && supabaseAdmin) {
      await supabaseAdmin
        .from('admin_access_logs')
        .insert({
          action: 'admin_logout',
          details: {
            user_id: session.userId,
            login_id: session.loginId
          },
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || undefined
        });
    }

    await deleteSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'ログアウトに失敗しました' },
      { status: 500 }
    );
  }
}