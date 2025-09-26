import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const token = searchParams.get('token');

    if (!storeId || !token) {
      return NextResponse.json(
        { error: 'Store ID and token are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // トークンの検証
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select('id, store_id, is_active')
      .eq('token', token)
      .eq('store_id', storeId)
      .single();

    if (tokenError || !tokenData || !tokenData.is_active) {
      return NextResponse.json(
        { error: 'Invalid or inactive token' },
        { status: 401 }
      );
    }

    // お気に入り登録ユーザーを取得
    const { data: favoriteUsers, error: fetchError } = await supabaseAdmin
      .from('store_favorite_users')
      .select('*')
      .eq('store_id', storeId)
      .order('favorited_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching favorite users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch favorite users' },
        { status: 500 }
      );
    }

    // メッセージ送信履歴を取得
    const { data: broadcastHistory, error: historyError } = await supabaseAdmin
      .from('broadcast_statistics')
      .select('*')
      .eq('store_id', storeId)
      .order('sent_at', { ascending: false })
      .limit(5);

    if (historyError) {
      console.error('Error fetching broadcast history:', historyError);
    }

    return NextResponse.json({
      success: true,
      users: favoriteUsers || [],
      totalCount: favoriteUsers?.length || 0,
      recentBroadcasts: broadcastHistory || []
    });
  } catch (error) {
    console.error('Error in favorite-users API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}