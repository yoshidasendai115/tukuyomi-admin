import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // お気に入り登録ユーザーを favorite_stores テーブルから取得
    const { data: favoriteUsers, error: fetchError } = await supabaseAdmin
      .from('favorite_stores')
      .select('user_id, store_id, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching favorite users:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch favorite users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      users: favoriteUsers || [],
      totalCount: favoriteUsers?.length || 0
    });
  } catch (error) {
    console.error('Error in admin favorite-count API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}