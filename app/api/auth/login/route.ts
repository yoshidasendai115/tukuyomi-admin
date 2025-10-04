import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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
    console.log('Environment check:', {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    });

    // Service Roleクライアントが利用可能か確認
    if (!supabaseAdmin) {
      console.error('Service Role Key not configured');
      return NextResponse.json(
        { message: 'サーバー設定エラー：管理者に連絡してください' },
        { status: 500 }
      );
    }

    // ユーザー情報を取得
    console.log('Querying user from database...');
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('admin_auth_users')
      .select('*')
      .eq('login_id', loginId)
      .single();

    if (fetchError) {
      console.error('Database query error:', {
        message: fetchError.message,
        details: fetchError.details,
        hint: fetchError.hint,
        code: fetchError.code
      });
      return NextResponse.json(
        {
          message: 'ログインIDまたはパスワードが正しくありません'
        },
        { status: 401 }
      );
    }

    if (!user) {
      console.log('User not found:', loginId);
      return NextResponse.json(
        {
          message: 'ログインIDまたはパスワードが正しくありません'
        },
        { status: 401 }
      );
    }

    console.log('User found:', {
      id: user.id,
      loginId: user.login_id,
      isActive: user.is_active,
      role: user.role,
      passwordHashLength: user.password_hash?.length
    });

    // アカウントが無効化されている場合
    if (!user.is_active) {
      return NextResponse.json(
        { message: 'このアカウントは無効化されています。管理者にお問い合わせください。' },
        { status: 401 }
      );
    }

    // ログイン試行回数とブロック時間のチェック
    const failedAttempts = user.failed_attempts || 0;
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    const maxAttempts = 5;

    // ブロック期間中かチェック
    if (lockedUntil && lockedUntil > new Date()) {
      return NextResponse.json(
        {
          message: 'ログイン試行回数の上限に達しました。30分後に再度お試しください。',
          attemptsRemaining: 0
        },
        { status: 401 }
      );
    }

    // パスワード検証
    console.log('Validating password...');
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password validation result:', { passwordValid });

    if (!passwordValid) {
      const newFailedAttempts = (user.failed_attempts || 0) + 1;
      const updateData: Record<string, unknown> = {
        failed_attempts: newFailedAttempts
      };

      // 5回失敗したらロック
      if (newFailedAttempts >= maxAttempts) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updateData.locked_until = lockUntil.toISOString();
      }

      // 失敗回数を増やす
      await supabaseAdmin
        .from('admin_auth_users')
        .update(updateData)
        .eq('id', user.id);

      const attemptsRemaining = Math.max(0, maxAttempts - newFailedAttempts);

      return NextResponse.json(
        {
          message: 'ログインIDまたはパスワードが正しくありません',
          attemptsRemaining
        },
        { status: 401 }
      );
    }

    // 認証成功：失敗回数をリセット、最終ログイン時刻を更新
    console.log('Authentication successful, updating user record...');
    await supabaseAdmin
      .from('admin_auth_users')
      .update({
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // セッション作成
    console.log('Creating session...');
    await createSession({
      userId: user.id,
      loginId: user.login_id,
      displayName: user.display_name,
      role: user.role,
      permissions: user.permissions || [],
      assignedStoreId: user.assigned_store_id
    });

    console.log('Login successful for user:', user.login_id);
    return NextResponse.json(
      {
        success: true,
        message: 'ログインに成功しました',
        role: user.role,
        assignedStoreId: user.assigned_store_id
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