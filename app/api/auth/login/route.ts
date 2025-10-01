import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { loginId, password } = await request.json();

    if (!loginId || !password) {
      return NextResponse.json(
        { message: 'ログインIDとパスワードを入力してください' },
        { status: 400 }
      );
    }

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // デバッグログ
    console.log('Login attempt:', { loginId, ip });
    console.log('Password received:', password);

    // Service Roleクライアントが利用可能か確認
    if (!supabaseAdmin) {
      console.error('Service Role Key not configured');
      console.error('SUPABASE_SECRET_KEY:', process.env.SUPABASE_SECRET_KEY ? 'SET' : 'NOT SET');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
      return NextResponse.json(
        { message: 'サーバー設定エラー：管理者に連絡してください' },
        { status: 500 }
      );
    }

    // 認証関数を呼び出し（Service Role権限で実行）
    const { data, error } = await supabaseAdmin.rpc('authenticate_admin', {
      p_login_id: loginId,
      p_password: password,
      p_ip_address: ip
    });

    // デバッグログ
    console.log('RPC Response:', { data, error });

    // エラーハンドリング
    if (error) {
      console.error('Authentication error:', error);

      const errorMessage = error?.message || '';

      if (errorMessage.includes('function') || errorMessage.includes('does not exist') || errorMessage.includes('42883')) {
        return NextResponse.json(
          { message: '認証システムが未設定です。管理者に連絡してください。' },
          { status: 500 }
        );
      }

      if (errorMessage.includes('42P01')) {
        return NextResponse.json(
          { message: '認証テーブルが存在しません。管理者に連絡してください。' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { message: '認証エラーが発生しました' },
        { status: 500 }
      );
    }

    if (!data || !data.success) {
      console.log('Authentication failed:', data);
      return NextResponse.json(
        {
          message: data?.message || 'ログインIDまたはパスワードが正しくありません',
          attemptsRemaining: data?.attempts_remaining
        },
        { status: 401 }
      );
    }

    // セッション作成
    await createSession({
      userId: data.user_id,
      loginId: data.login_id,
      displayName: data.display_name,
      role: data.role,
      permissions: data.permissions
    });

    return NextResponse.json(
      {
        success: true,
        message: 'ログインに成功しました'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    return NextResponse.json(
      {
        message: '予期しないエラーが発生しました',
        ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
      },
      { status: 500 }
    );
  }
}