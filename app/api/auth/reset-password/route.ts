import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'トークンとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワードのバリデーション
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) ||
        !/[0-9]/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードは大文字、小文字、数字、特殊文字を含む必要があります' },
        { status: 400 }
      );
    }

    // トークンの検証
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !resetToken) {
      console.log('[Reset Password] Invalid token:', token);
      return NextResponse.json(
        { error: '無効なリセットリンクです' },
        { status: 400 }
      );
    }

    // トークンが既に使用されているかチェック
    if (resetToken.used_at) {
      console.log('[Reset Password] Token already used:', token);
      return NextResponse.json(
        { error: 'このリセットリンクは既に使用されています' },
        { status: 400 }
      );
    }

    // トークンの有効期限チェック
    const expiresAt = new Date(resetToken.expires_at);
    if (expiresAt < new Date()) {
      console.log('[Reset Password] Token expired:', token);
      return NextResponse.json(
        { error: 'リセットリンクの有効期限が切れています' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    const { error: updateError } = await supabaseAdmin
      .from('admin_auth_users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resetToken.user_id);

    if (updateError) {
      console.error('[Reset Password] Failed to update password:', updateError);
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // トークンを使用済みにする
    const { error: markUsedError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', resetToken.id);

    if (markUsedError) {
      console.error('[Reset Password] Failed to mark token as used:', markUsedError);
      // パスワードは更新されているので、エラーは無視
    }

    console.log('[Reset Password] Password reset successful for user:', resetToken.user_id);

    // 失敗試行回数とロックをリセット
    await supabaseAdmin
      .from('admin_auth_users')
      .update({
        failed_attempts: 0,
        locked_until: null,
      })
      .eq('id', resetToken.user_id);

    return NextResponse.json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    console.error('[Reset Password] Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
