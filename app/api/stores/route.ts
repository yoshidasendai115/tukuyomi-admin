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
    const plan = searchParams.get('plan') || 'all';
    const expired = searchParams.get('expired') === 'true';
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

    // ジャンルフィルタ（genres.nameでフィルタ）
    if (genre) {
      // countQueryはJOINしていないため、genre_idで絞り込む必要がある
      // まずgenre名からIDを取得
      const { data: genreData } = await supabaseAdmin
        .from('genres')
        .select('id')
        .eq('name', genre)
        .single();

      if (genreData) {
        countQuery = countQuery.eq('genre_id', genreData.id);
        dataQuery = dataQuery.eq('genre_id', genreData.id);
      }
    }

    // アクティブ状態フィルタ（showInactiveがfalseの場合のみアクティブな店舗を表示）
    if (!showInactive) {
      countQuery = countQuery.eq('is_active', true);
      dataQuery = dataQuery.eq('is_active', true);
    }

    // プランフィルタ（subscription_plan_idで絞り込み）
    if (plan !== 'all') {
      // プラン名からsubscription_plan_idへのマッピング
      const planIdMapping: Record<string, number> = {
        'free': 0,
        'light': 1,
        'basic': 2,
        'premium5': 3,
        'premium10': 4,
        'premium15': 5
      };

      const subscriptionPlanId = planIdMapping[plan] ?? 0; // デフォルトはFree
      countQuery = countQuery.eq('subscription_plan_id', subscriptionPlanId);
      dataQuery = dataQuery.eq('subscription_plan_id', subscriptionPlanId);
    }

    // 期限切れフィルタ
    if (expired) {
      const now = new Date().toISOString();
      countQuery = countQuery
        .neq('subscription_plan_id', 0)
        .not('plan_expires_at', 'is', null)
        .lt('plan_expires_at', now);
      dataQuery = dataQuery
        .neq('subscription_plan_id', 0)
        .not('plan_expires_at', 'is', null)
        .lt('plan_expires_at', now);
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