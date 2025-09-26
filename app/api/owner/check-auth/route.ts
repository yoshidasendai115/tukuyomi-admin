import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const sessionToken = request.cookies.get('store_edit_session')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // トークンと認証設定を取得
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select(`
        id,
        token,
        is_active,
        admin_store_edit_credentials!left (
          id,
          require_auth,
          is_active
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token lookup error:', tokenError);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // トークンが無効な場合
    if (!tokenData.is_active) {
      return NextResponse.json(
        { error: 'Token has been deactivated' },
        { status: 401 }
      );
    }

    const credentials = tokenData.admin_store_edit_credentials;

    // 認証が不要な場合
    if (!credentials || !credentials.require_auth || !credentials.is_active) {
      return NextResponse.json({
        requireAuth: false,
        authenticated: true
      });
    }

    // セッショントークンがない場合
    if (!sessionToken) {
      return NextResponse.json({
        requireAuth: true,
        authenticated: false,
        message: '認証が必要です'
      });
    }

    try {
      // JWTトークンを検証
      const { payload } = await jwtVerify(sessionToken, secret);

      // トークンIDが一致するか確認
      if (payload.tokenId !== tokenData.id) {
        return NextResponse.json({
          requireAuth: true,
          authenticated: false,
          message: '無効なセッション'
        });
      }

      // セッションがデータベースに存在し、有効か確認
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('admin_store_edit_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('token_id', tokenData.id)
        .eq('is_active', true)
        .single();

      if (sessionError || !sessionData) {
        return NextResponse.json({
          requireAuth: true,
          authenticated: false,
          message: 'セッションが無効です'
        });
      }

      // セッションの有効期限を確認
      if (new Date(sessionData.expires_at) < new Date()) {
        // セッションを無効化
        await supabaseAdmin
          .from('admin_store_edit_sessions')
          .update({ is_active: false })
          .eq('id', sessionData.id);

        return NextResponse.json({
          requireAuth: true,
          authenticated: false,
          message: 'セッションが期限切れです'
        });
      }

      // 認証成功
      return NextResponse.json({
        requireAuth: true,
        authenticated: true,
        sessionId: sessionData.id,
        expiresAt: sessionData.expires_at
      });
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return NextResponse.json({
        requireAuth: true,
        authenticated: false,
        message: 'セッションの検証に失敗しました'
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { message: '認証確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
}