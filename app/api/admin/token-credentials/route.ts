import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tokenId, email, password, requireAuth } = await request.json();

    if (!tokenId || !email || !password) {
      return NextResponse.json(
        { error: 'Token ID, email, and password are required' },
        { status: 400 }
      );
    }

    // パスワードのバリデーション
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で設定してください' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
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
        { error: 'トークンが見つかりません' },
        { status: 404 }
      );
    }

    // パスワードをハッシュ化
    const passwordHash = await bcrypt.hash(password, 10);

    // 既存の認証情報を確認
    const { data: existingCredentials } = await supabaseAdmin
      .from('admin_store_edit_credentials')
      .select('id')
      .eq('token_id', tokenId)
      .single();

    let result;

    if (existingCredentials) {
      // 更新
      result = await supabaseAdmin
        .from('admin_store_edit_credentials')
        .update({
          email,
          password_hash: passwordHash,
          require_auth: requireAuth || false,
          is_active: true,
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId)
        .select()
        .single();
    } else {
      // 新規作成
      result = await supabaseAdmin
        .from('admin_store_edit_credentials')
        .insert({
          token_id: tokenId,
          email,
          password_hash: passwordHash,
          require_auth: requireAuth || false,
          is_active: true
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Failed to save credentials:', result.error);
      return NextResponse.json(
        { error: '認証情報の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: existingCredentials ? '認証情報を更新しました' : '認証情報を設定しました',
      credentialId: result.data.id
    });
  } catch (error) {
    console.error('Error setting credentials:', error);
    return NextResponse.json(
      { message: '認証情報の設定中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 認証情報を取得
    const { data, error } = await supabaseAdmin
      .from('admin_store_edit_credentials')
      .select('id, email, require_auth, is_active, failed_attempts, locked_until, last_login_at')
      .eq('token_id', tokenId)
      .single();

    if (error) {
      // 存在しない場合は空を返す
      if (error.code === 'PGRST116') {
        return NextResponse.json({ credentials: null });
      }
      console.error('Failed to fetch credentials:', error);
      return NextResponse.json(
        { error: '認証情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ credentials: data });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { message: '認証情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 認証情報を削除
    const { error } = await supabaseAdmin
      .from('admin_store_edit_credentials')
      .delete()
      .eq('token_id', tokenId);

    if (error) {
      console.error('Failed to delete credentials:', error);
      return NextResponse.json(
        { error: '認証情報の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '認証情報を削除しました'
    });
  } catch (error) {
    console.error('Error deleting credentials:', error);
    return NextResponse.json(
      { message: '認証情報の削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}