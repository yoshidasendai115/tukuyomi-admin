import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // セッションチェック
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'すべての項目を入力してください' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: '新しいパスワードが一致しません' },
        { status: 400 }
      );
    }

    // パスワード強度チェック
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      return NextResponse.json(
        { error: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります' },
        { status: 400 }
      );
    }

    // 現在のユーザー情報を取得
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('admin_auth_users')
      .select('*')
      .eq('id', session.userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 現在のパスワードを検証
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      // IPアドレスの取得
      const ip = request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown';

      // 失敗をログに記録
      await supabaseAdmin
        .from('admin_access_logs')
        .insert({
          action: 'password_change_failed',
          details: {
            login_id: user.login_id,
            user_id: user.id,
            reason: 'invalid_current_password'
          },
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || undefined
        });

      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 新しいパスワードをハッシュ化
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    const { error: updateError } = await supabaseAdmin
      .from('admin_auth_users')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // 成功をログに記録
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'password_changed',
        details: {
          login_id: user.login_id,
          user_id: user.id
        },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined
      });

    return NextResponse.json(
      { message: 'パスワードを変更しました' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
