import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createSession } from '@/lib/auth';
import { initializeWeeklyLimit } from '@/lib/broadcast-limits';
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
      passwordHashLength: user.password_hash?.length,
      assignedStoreId: user.assigned_store_id
    });

    // アカウントが無効化されている場合
    if (!user.is_active) {
      await supabaseAdmin
        .from('admin_access_logs')
        .insert({
          action: 'admin_login_blocked',
          details: {
            login_id: loginId,
            reason: 'account_inactive'
          },
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || undefined
        });

      return NextResponse.json(
        { message: 'このアカウントは無効化されています。管理者にお問い合わせください。' },
        { status: 401 }
      );
    }

    // store_ownerの場合、assigned_store_idが必須
    if (user.role === 'store_owner' && !user.assigned_store_id) {
      console.error('[Login] store_owner has no assigned_store_id:', user.login_id);

      await supabaseAdmin
        .from('admin_access_logs')
        .insert({
          action: 'admin_login_failed',
          details: {
            login_id: loginId,
            reason: 'missing_assigned_store',
            user_id: user.id
          },
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || undefined
        });

      return NextResponse.json(
        { message: 'アカウント設定に不備があります。がるなび運営にお問い合わせください。' },
        { status: 500 }
      );
    }

    // ログイン試行回数とブロック時間のチェック
    const failedAttempts = user.failed_attempts || 0;
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    const maxAttempts = 5;

    // ブロック期間中かチェック
    if (lockedUntil && lockedUntil > new Date()) {
      await supabaseAdmin
        .from('admin_access_logs')
        .insert({
          action: 'admin_login_blocked',
          details: {
            login_id: loginId,
            reason: 'too_many_attempts',
            locked_until: lockedUntil.toISOString()
          },
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || undefined
        });

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
      const isLocked = newFailedAttempts >= maxAttempts;
      let lockUntil: Date | null = null;
      if (isLocked) {
        lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updateData.locked_until = lockUntil.toISOString();
      }

      // 失敗回数を増やす
      await supabaseAdmin
        .from('admin_auth_users')
        .update(updateData)
        .eq('id', user.id);

      // ログイン失敗をログに記録
      await supabaseAdmin
        .from('admin_access_logs')
        .insert({
          action: isLocked ? 'admin_login_blocked' : 'admin_login_failed',
          details: {
            login_id: loginId,
            attempts: newFailedAttempts,
            max_attempts: maxAttempts
          },
          ip_address: ip,
          user_agent: request.headers.get('user-agent') || undefined
        });

      // アカウントがロックされた場合、メール送信
      if (isLocked && user.email && lockUntil) {
        console.log('[Login] Account locked, sending notification email to:', user.login_id);

        try {
          // ロック期間を計算（分単位）
          const lockDurationMinutes = 30; // 固定値

          // ロック解除トークンを作成
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 30);

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
            console.error('[Login] Failed to create unlock token:', tokenError);
          } else if (process.env.NEXT_PUBLIC_APP_URL) {
            // ロック解除URLを生成
            const unlockUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/unlock-account/${unlockToken.token}`;

            // メール送信
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
              console.error('[Login] Failed to send lock notification email:', errorData);
            } else {
              console.log('[Login] Lock notification email sent successfully');
            }
          }
        } catch (emailError) {
          console.error('[Login] Error sending lock notification email:', emailError);
          // メール送信失敗してもログイン処理（ロック）は継続
        }
      }

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

    // ログイン成功をログに記録
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'admin_login_success',
        details: {
          login_id: loginId,
          user_id: user.id,
          role: user.role
        },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined
      });

    // セッション作成
    console.log('Creating session...');
    const sessionData: {
      userId: string;
      loginId: string;
      displayName: string;
      role: string;
      permissions: string[];
      assignedStoreId?: string;
      allowedUrl?: string;
    } = {
      userId: user.id,
      loginId: user.login_id,
      displayName: user.display_name,
      role: user.role,
      permissions: user.permissions || [],
      assignedStoreId: user.assigned_store_id
    };

    // store_ownerの場合、許可されたURLを設定
    if (user.role === 'store_owner' && user.assigned_store_id) {
      sessionData.allowedUrl = `/admin/stores/${user.assigned_store_id}/edit`;
    }

    await createSession(sessionData);

    // store_ownerの場合、お知らせ配信の週次制限を初期化
    if (user.role === 'store_owner' && user.assigned_store_id) {
      console.log('[Login] Initializing weekly broadcast limit for store:', user.assigned_store_id);
      const initResult = await initializeWeeklyLimit(user.assigned_store_id);
      if (!initResult.success) {
        console.error('[Login] Failed to initialize weekly limit:', initResult.error);
        // 初期化失敗してもログインは継続（エラーログのみ）
      }
    }

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