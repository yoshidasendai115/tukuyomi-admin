import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { loginId } = await request.json();

    if (!loginId) {
      return NextResponse.json(
        { error: 'ログインIDを入力してください' },
        { status: 400 }
      );
    }

    if (
      typeof supabaseAdmin !== 'object' ||
      supabaseAdmin === null
    ) {
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // ユーザーの存在確認とロック状態のチェック
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_auth_users')
      .select('id, login_id, display_name, email, locked_until')
      .eq('login_id', loginId)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // セキュリティのため、ユーザーが存在しない場合でも同じメッセージを返す
      console.log('[Request Unlock] User not found:', loginId);
      return NextResponse.json({
        success: true,
        message: 'ロック解除メールを送信しました',
      });
    }

    // メールアドレスが未設定の場合はエラー
    if (!user.email) {
      console.log('[Request Unlock] Email not set for user:', loginId);
      return NextResponse.json(
        { error: 'このアカウントにはメールアドレスが登録されていません。管理者にお問い合わせください。' },
        { status: 400 }
      );
    }

    // アカウントがロック中かチェック
    const now = new Date();
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    const isLocked = lockedUntil && lockedUntil > now;

    if (!isLocked) {
      console.log('[Request Unlock] Account is not locked:', loginId);
      return NextResponse.json(
        { error: 'このアカウントはロックされていません' },
        { status: 400 }
      );
    }

    // ロック解除トークンの有効期限（30分後）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // ロック解除トークンを作成
    const { data: unlockToken, error: tokenError } = await supabaseAdmin
      .from('account_unlock_tokens')
      .insert({
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined,
      })
      .select('token')
      .single();

    if (tokenError || !unlockToken) {
      console.error('[Request Unlock] Token creation error:', tokenError);
      return NextResponse.json(
        { error: 'トークンの生成に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[Request Unlock] Token created for user:', user.login_id);

    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      console.error('[Request Unlock] NEXT_PUBLIC_APP_URL is not configured');
      return NextResponse.json(
        { error: 'サーバー設定エラー: NEXT_PUBLIC_APP_URL が設定されていません' },
        { status: 500 }
      );
    }

    // ロック解除URLを生成
    const unlockUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/unlock-account/${unlockToken.token}`;

    // ロック期間を計算（分単位）
    const lockDurationMinutes = Math.ceil((lockedUntil.getTime() - now.getTime()) / (1000 * 60));

    // メール送信
    try {
      const emailResponse = await fetch(new URL('/api/emails/send', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'account_locked',
          to: user.email,
          data: {
            adminName: user.display_name || user.login_id,
            unlockUrl,
            lockDurationMinutes,
          },
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('[Request Unlock] Failed to send email:', errorData);
        return NextResponse.json(
          { error: 'メールの送信に失敗しました' },
          { status: 500 }
        );
      }

      console.log('[Request Unlock] Unlock email sent to:', user.login_id);
    } catch (emailError) {
      console.error('[Request Unlock] Email error:', emailError);
      return NextResponse.json(
        { error: 'メールの送信に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ロック解除メールを送信しました',
    });
  } catch (error) {
    console.error('[Request Unlock] Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
