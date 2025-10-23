import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが必要です' },
        { status: 400 }
      );
    }

    // トークンの検証
    const { data: unlockToken, error: tokenError } = await supabaseAdmin
      .from('account_unlock_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (tokenError || !unlockToken) {
      console.log('[Unlock Account] Invalid token:', token);
      return NextResponse.json(
        { error: '無効なロック解除リンクです' },
        { status: 400 }
      );
    }

    // トークンが既に使用されているかチェック
    if (unlockToken.used_at) {
      console.log('[Unlock Account] Token already used:', token);
      return NextResponse.json(
        { error: 'このロック解除リンクは既に使用されています' },
        { status: 400 }
      );
    }

    // トークンの有効期限チェック
    const expiresAt = new Date(unlockToken.expires_at);
    if (expiresAt < new Date()) {
      console.log('[Unlock Account] Token expired:', token);
      return NextResponse.json(
        { error: 'ロック解除リンクの有効期限が切れています' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_auth_users')
      .select('id, login_id, display_name, email')
      .eq('id', unlockToken.user_id)
      .single();

    if (userError || !user) {
      console.error('[Unlock Account] User not found:', unlockToken.user_id);
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // アカウントのロックを解除
    const { error: updateError } = await supabaseAdmin
      .from('admin_auth_users')
      .update({
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', unlockToken.user_id);

    if (updateError) {
      console.error('[Unlock Account] Failed to unlock account:', updateError);
      return NextResponse.json(
        { error: 'アカウントのロック解除に失敗しました' },
        { status: 500 }
      );
    }

    // トークンを使用済みにする
    const { error: markUsedError } = await supabaseAdmin
      .from('account_unlock_tokens')
      .update({
        used_at: new Date().toISOString(),
      })
      .eq('id', unlockToken.id);

    if (markUsedError) {
      console.error('[Unlock Account] Failed to mark token as used:', markUsedError);
      // アカウントは解除されているので、エラーは無視
    }

    console.log('[Unlock Account] Account unlocked successfully for user:', user.login_id);

    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('[Unlock Account] NEXT_PUBLIC_APP_URL is not configured');
      // ロック解除は成功したので、メール送信失敗でもエラーにしない
    } else if (user.email) {
      // ログインURLを生成
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`;

      // ロック解除完了メールを送信
      try {
        const emailResponse = await fetch(new URL('/api/emails/send', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'account_unlocked',
            to: user.email,
            data: {
              adminName: user.display_name || user.login_id,
              loginUrl,
            },
          }),
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('[Unlock Account] Failed to send email:', errorData);
          // メール送信失敗してもロック解除は成功しているので、エラーにしない
        } else {
          console.log('[Unlock Account] Unlock confirmation email sent to:', user.login_id);
        }
      } catch (emailError) {
        console.error('[Unlock Account] Email error:', emailError);
        // メール送信失敗してもロック解除は成功しているので、エラーにしない
      }
    }

    return NextResponse.json({
      success: true,
      message: 'アカウントのロックを解除しました',
    });
  } catch (error) {
    console.error('[Unlock Account] Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
