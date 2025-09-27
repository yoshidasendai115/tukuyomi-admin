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
    const search = searchParams.get('search') || '';
    const area = searchParams.get('area') || '';
    const genre = searchParams.get('genre') || '';
    const showInactive = searchParams.get('showInactive') === 'true';
    const offset = (page - 1) * limit;

    // 基本クエリを構築
    let countQuery = supabaseAdmin.from('stores').select('*', { count: 'exact', head: true });
    let dataQuery = supabaseAdmin.from('stores').select('*');

    // 検索条件を適用（連続文字列として検索）
    if (search) {
      // 前後の空白を除去し、そのまま部分一致検索（大文字小文字を区別しない）
      const searchTerm = search.trim();
      if (searchTerm) {
        // ilikeで大文字小文字を区別せずに部分一致検索
        countQuery = countQuery.ilike('name', `%${searchTerm}%`);
        dataQuery = dataQuery.ilike('name', `%${searchTerm}%`);
      }
    }

    // エリアフィルタ
    if (area) {
      countQuery = countQuery.eq('area', area);
      dataQuery = dataQuery.eq('area', area);
    }

    // ジャンルフィルタ
    if (genre) {
      countQuery = countQuery.eq('genre', genre);
      dataQuery = dataQuery.eq('genre', genre);
    }

    // アクティブ状態フィルタ（showInactiveがfalseの場合のみアクティブな店舗を表示）
    if (!showInactive) {
      countQuery = countQuery.eq('is_active', true);
      dataQuery = dataQuery.eq('is_active', true);
    }

    // 総数を取得
    const { count: totalCount } = await countQuery;

    // データを取得（ページネーション付き）
    const { data, error } = await dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching stores:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // ページネーション情報を含めて返す
    return NextResponse.json({
      data,
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