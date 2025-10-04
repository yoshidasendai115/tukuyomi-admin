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
    const showRecommendedOnly = searchParams.get('showRecommendedOnly') === 'true';
    const offset = (page - 1) * limit;

    // 基本クエリを構築
    let countQuery = supabaseAdmin.from('stores').select('*', { count: 'exact', head: true });
    let dataQuery = supabaseAdmin.from('stores').select(`
      *,
      genres!inner(name)
    `);

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

    // エリアフィルタ（stationカラムで検索）
    if (area) {
      countQuery = countQuery.eq('station', area);
      dataQuery = dataQuery.eq('station', area);
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

    // おすすめ店舗フィルタ（showRecommendedOnlyがtrueの場合のみおすすめ店舗を表示）
    if (showRecommendedOnly) {
      countQuery = countQuery.eq('is_recommended', true);
      dataQuery = dataQuery.eq('is_recommended', true);
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

    // データを整形（genresからnameを抽出、stationをareaとして使用）
    const formattedData = data?.map((store: any) => ({
      ...store,
      genre: store.genres?.name || null,
      area: store.station || null,
      genres: undefined // 元のgenresオブジェクトは削除
    }));

    // ページネーション情報を含めて返す
    return NextResponse.json({
      data: formattedData,
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