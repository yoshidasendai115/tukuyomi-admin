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
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { requestId } = await request.json();

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

    if (requestData.status !== 'approved') {
      return NextResponse.json(
        { error: '承認済みの申請のみパスワードをリセットできます' },
        { status: 400 }
      );
    }

    // 新しいパスワードを生成
    const newPassword = generatePassword(8);
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ユーザーアカウントのパスワードを更新
    const { error: updateUserError } = await supabaseAdmin
      .from('admin_auth_users')
      .update({
        password_hash: hashedPassword
      })
      .eq('login_id', requestData.applicant_email);

    if (updateUserError) {
      console.error('Error updating user password:', updateUserError);
      return NextResponse.json(
        { error: 'パスワード更新に失敗しました' },
        { status: 500 }
      );
    }

    // 申請レコードのパスワードも更新
    const { error: updateRequestError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        generated_password: newPassword
      })
      .eq('id', requestId);

    if (updateRequestError) {
      console.error('Error updating request password:', updateRequestError);
      return NextResponse.json(
        { error: '申請レコードの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードをリセットしました',
      credentials: {
        loginId: requestData.applicant_email,
        password: newPassword,
        displayName: requestData.applicant_name
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: 'パスワードリセット中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
