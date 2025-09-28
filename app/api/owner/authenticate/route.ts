import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and password are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // IPアドレスを取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // トークンと認証情報を取得
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select(`
        id,
        token,
        is_active,
        admin_store_edit_credentials (
          id,
          email,
          password_hash,
          is_active,
          require_auth,
          failed_attempts,
          locked_until
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: '無効なトークンです' },
        { status: 401 }
      );
    }

    // トークンが無効な場合
    if (!tokenData.is_active) {
      return NextResponse.json(
        { error: 'トークンが無効になっています' },
        { status: 401 }
      );
    }

    const credentials = Array.isArray(tokenData.admin_store_edit_credentials)
      ? tokenData.admin_store_edit_credentials[0]
      : tokenData.admin_store_edit_credentials;

    // 認証情報が設定されていない場合
    if (!credentials) {
      return NextResponse.json(
        { error: '認証が設定されていません' },
        { status: 401 }
      );
    }

    // 認証が無効な場合
    if (!credentials.is_active) {
      return NextResponse.json(
        { error: '認証が無効になっています' },
        { status: 401 }
      );
    }

    // アカウントがロックされている場合
    if (credentials.locked_until && new Date(credentials.locked_until) > new Date()) {
      const lockMinutes = Math.ceil((new Date(credentials.locked_until).getTime() - Date.now()) / 60000);

      // ログ記録
      await supabaseAdmin
        .from('admin_store_edit_auth_logs')
        .insert({
          token_id: tokenData.id,
          credential_id: credentials.id,
          action: 'locked',
          email,
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || 'unknown'
        });

      return NextResponse.json(
        { error: `アカウントがロックされています。${lockMinutes}分後に再試行してください。` },
        { status: 429 }
      );
    }

    // メールアドレスの確認
    if (credentials.email.toLowerCase() !== email.toLowerCase()) {
      // 失敗ログ記録
      await supabaseAdmin
        .from('admin_store_edit_auth_logs')
        .insert({
          token_id: tokenData.id,
          credential_id: credentials.id,
          action: 'login_failed',
          email,
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || 'unknown',
          details: { reason: 'email_mismatch' }
        });

      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // パスワードの確認
    const isValidPassword = await bcrypt.compare(password, credentials.password_hash);

    if (!isValidPassword) {
      // 失敗回数を更新
      const newFailedAttempts = (credentials.failed_attempts || 0) + 1;
      const shouldLock = newFailedAttempts >= 5;

      await supabaseAdmin
        .from('admin_store_edit_credentials')
        .update({
          failed_attempts: newFailedAttempts,
          locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', credentials.id);

      // 失敗ログ記録
      await supabaseAdmin
        .from('admin_store_edit_auth_logs')
        .insert({
          token_id: tokenData.id,
          credential_id: credentials.id,
          action: 'login_failed',
          email,
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || 'unknown',
          details: {
            reason: 'invalid_password',
            attempts: newFailedAttempts
          }
        });

      if (shouldLock) {
        return NextResponse.json(
          { error: '失敗回数が多すぎるため、アカウントがロックされました。15分後に再試行してください。' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 認証成功 - 失敗回数をリセット
    await supabaseAdmin
      .from('admin_store_edit_credentials')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', credentials.id);

    // セッショントークンを生成
    const sessionToken = await new SignJWT({
      tokenId: tokenData.id,
      credentialId: credentials.id,
      email: credentials.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(secret);

    // セッションをデータベースに保存
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    const { error: sessionError } = await supabaseAdmin
      .from('admin_store_edit_sessions')
      .insert({
        token_id: tokenData.id,
        credential_id: credentials.id,
        session_token: sessionToken,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || 'unknown',
        expires_at: expiresAt.toISOString()
      });

    if (sessionError) {
      console.error('Failed to save session:', sessionError);
    }

    // 成功ログ記録
    await supabaseAdmin
      .from('admin_store_edit_auth_logs')
      .insert({
        token_id: tokenData.id,
        credential_id: credentials.id,
        action: 'login_success',
        email,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    const response = NextResponse.json({
      success: true,
      message: '認証に成功しました'
    });

    // セッションクッキーを設定
    response.cookies.set('store_edit_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24時間
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { message: '認証中にエラーが発生しました' },
      { status: 500 }
    );
  }
}