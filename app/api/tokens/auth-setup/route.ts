import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 認証設定を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // 認証設定を取得
    const { data: authData, error } = await supabaseAdmin
      .from('admin_store_edit_credentials')
      .select('*')
      .eq('token_id', tokenId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
      console.error('Error fetching auth settings:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      hasAuth: !!authData,
      authData: authData ? {
        id: authData.id,
        email: authData.email,
        isActive: authData.is_active,
        requireAuth: authData.require_auth,
        lastLoginAt: authData.last_login_at
      } : null
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 認証設定を作成/更新
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { tokenId, email, password, requireAuth = true } = await request.json();

    if (!tokenId || !email || !password) {
      return NextResponse.json(
        { error: 'Token ID, email, and password are required' },
        { status: 400 }
      );
    }

    // トークンの存在確認
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select('id')
      .eq('id', tokenId)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid token ID' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // 既存の認証設定を確認
    const { data: existingAuth } = await supabaseAdmin
      .from('admin_store_edit_credentials')
      .select('id')
      .eq('token_id', tokenId)
      .single();

    let result;
    if (existingAuth) {
      // 更新
      result = await supabaseAdmin
        .from('admin_store_edit_credentials')
        .update({
          email,
          password_hash: passwordHash,
          require_auth: requireAuth,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId);
    } else {
      // 新規作成
      result = await supabaseAdmin
        .from('admin_store_edit_credentials')
        .insert({
          token_id: tokenId,
          email,
          password_hash: passwordHash,
          require_auth: requireAuth,
          is_active: true
        });
    }

    if (result.error) {
      console.error('Error setting up auth:', result.error);
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: existingAuth ? '認証設定を更新しました' : '認証設定を作成しました'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 認証設定を無効化
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // 認証を無効化（削除せずにフラグを更新）
    const { error } = await supabaseAdmin
      .from('admin_store_edit_credentials')
      .update({
        require_auth: false,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('token_id', tokenId);

    if (error) {
      console.error('Error disabling auth:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // 関連するセッションも無効化
    await supabaseAdmin
      .from('admin_store_edit_sessions')
      .update({ is_active: false })
      .eq('token_id', tokenId);

    return NextResponse.json({
      success: true,
      message: '認証を無効化しました'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}