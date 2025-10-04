import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 8桁のランダムパスワードを生成
function generatePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, adminNotes } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 申請データを取得
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // 8桁のランダムパスワードを生成
    const plainPassword = generatePassword(8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // アカウントを作成（メールアドレスをログインIDとして使用）
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('admin_auth_users')
      .insert({
        login_id: requestData.applicant_email,
        password_hash: hashedPassword,
        display_name: requestData.applicant_name,
        role: 'store_owner',
        assigned_store_id: requestData.store_id,
        is_active: true
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user:', userError);
      return NextResponse.json(
        { error: 'アカウント作成に失敗しました: ' + userError.message },
        { status: 500 }
      );
    }

    // 申請を承認済みに更新（生成したパスワードも保存）
    const { error: updateError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        processed_by: session.userId,
        processed_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        generated_password: plainPassword
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      // ユーザー作成はロールバックしない（手動で削除可能）
      return NextResponse.json(
        { error: '申請更新に失敗しました' },
        { status: 500 }
      );
    }

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // アクセスログに記録
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'request_approved',
        details: {
          request_id: requestId,
          store_id: requestData.store_id,
          applicant_email: requestData.applicant_email,
          processed_by: session.userId,
          processed_by_name: session.displayName
        },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined
      });

    return NextResponse.json({
      success: true,
      message: '申請を承認しました',
      credentials: {
        loginId: requestData.applicant_email,
        password: plainPassword,
        displayName: requestData.applicant_name
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}