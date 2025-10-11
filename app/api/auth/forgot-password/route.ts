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

    // ユーザーの存在確認
    const { data: user, error: userError } = await supabaseAdmin
      .from('admin_auth_users')
      .select('id, login_id, display_name, email')
      .eq('login_id', loginId)
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      // セキュリティのため、ユーザーが存在しない場合でも同じメッセージを返す
      console.log('[Forgot Password] User not found:', loginId);
      return NextResponse.json({
        success: true,
        message: 'リセットメールを送信しました',
      });
    }

    // メールアドレスが未設定の場合はエラー
    if (!user.email) {
      console.log('[Forgot Password] Email not set for user:', loginId);
      return NextResponse.json(
        { error: 'このアカウントにはメールアドレスが登録されていません。管理者にお問い合わせください。' },
        { status: 400 }
      );
    }

    // トークンの有効期限（30分後）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // リセットトークンを作成
    const { data: resetToken, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined,
      })
      .select('token')
      .single();

    if (tokenError || !resetToken) {
      console.error('[Forgot Password] Token creation error:', tokenError);
      return NextResponse.json(
        { error: 'トークンの生成に失敗しました' },
        { status: 500 }
      );
    }

    console.log('[Forgot Password] Token created for user:', user.login_id);

    // リセットURLを生成
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/admin/reset-password?token=${resetToken.token}`;

    // メール送信
    try {
      const emailResponse = await fetch(new URL('/api/emails/send', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'password_reset',
          to: user.email,
          data: {
            adminName: user.display_name || user.login_id,
            resetUrl,
            expiryMinutes: 30,
          },
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('[Forgot Password] Failed to send email:', errorData);
        return NextResponse.json(
          { error: 'メールの送信に失敗しました' },
          { status: 500 }
        );
      }

      console.log('[Forgot Password] Reset email sent to:', user.login_id);
    } catch (emailError) {
      console.error('[Forgot Password] Email error:', emailError);
      return NextResponse.json(
        { error: 'メールの送信に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'リセットメールを送信しました',
    });
  } catch (error) {
    console.error('[Forgot Password] Unexpected error:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
