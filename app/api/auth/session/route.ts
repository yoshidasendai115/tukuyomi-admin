import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // データベースから最新の管理者情報を取得
    if (supabaseAdmin) {
      const { data: adminUser, error } = await supabaseAdmin
        .from('admin_auth_users')
        .select('*')
        .eq('id', session.userId)
        .single();

      if (!error && adminUser) {
        // セッション情報を最新の情報で更新
        session.displayName = adminUser.display_name;
        session.loginId = adminUser.login_id;
        session.role = adminUser.role;
        session.assignedStoreId = adminUser.assigned_store_id;
      }
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { message: 'セッション取得に失敗しました' },
      { status: 500 }
    );
  }
}