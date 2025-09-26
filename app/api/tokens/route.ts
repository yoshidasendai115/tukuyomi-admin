import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // セッション確認
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

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // 総数を取得
    const { count: totalCount } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select('*', { count: 'exact', head: true });

    // トークンとリクエスト情報を結合して取得（ページネーション付き）
    const { data: tokens, error } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select(`
        id,
        token,
        request_id,
        expires_at,
        is_active,
        use_count,
        max_uses,
        created_at,
        last_used_at,
        admin_store_edit_requests (
          id,
          store_name,
          store_id
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching tokens:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // データを整形
    const formattedTokens = tokens?.map((token: any) => ({
      id: token.id,
      token: token.token,
      store_id: token.admin_store_edit_requests?.store_id || '',
      store_name: token.admin_store_edit_requests?.store_name || '不明',
      expires_at: token.expires_at,
      use_count: token.use_count || 0,
      max_uses: token.max_uses || 1,
      is_active: token.is_active,
      created_at: token.created_at,
      last_used_at: token.last_used_at,
      url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/store/edit/${token.token}`
    })) || [];

    // ページネーション情報を含めて返す
    return NextResponse.json({
      data: formattedTokens,
      pagination: {
        total: totalCount || 0,
        page,
        limit,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// トークン無効化
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('id');

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

    // トークンを無効化
    const { error } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .update({ is_active: false })
      .eq('id', tokenId);

    if (error) {
      console.error('Error deactivating token:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}