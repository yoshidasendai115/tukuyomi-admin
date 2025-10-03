import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 業態マスタを取得（is_visible=trueのみ）
    const { data: genres, error: genreError } = await supabaseAdmin
      .from('genres')
      .select('*')
      .eq('is_visible', true)
      .order('display_order', { ascending: true });

    if (genreError) {
      console.error('Error fetching genres:', genreError);
      return NextResponse.json(
        { error: '業態マスタの取得に失敗しました' },
        { status: 500 }
      );
    }

    // エリア（駅グループ）マスタを取得
    const { data: areas, error: areaError } = await supabaseAdmin
      .from('station_groups')
      .select('*')
      .order('display_name', { ascending: true });

    if (areaError) {
      console.error('Error fetching areas:', areaError);
      return NextResponse.json(
        { error: 'エリアマスタの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      genres: genres || [],
      areas: areas || []
    });
  } catch (error) {
    console.error('Error in master-data API:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
