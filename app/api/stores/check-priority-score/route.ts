import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const score = searchParams.get('score');
    const excludeStoreId = searchParams.get('excludeStoreId');

    if (!score) {
      return NextResponse.json(
        { error: 'Score parameter is required' },
        { status: 400 }
      );
    }

    const priorityScore = Number(score);

    if (priorityScore < 1 || priorityScore > 100) {
      return NextResponse.json({ exists: false });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }

    // 指定されたスコアを持つ店舗を検索（自分自身を除く）
    let query = supabaseAdmin
      .from('stores')
      .select('id, name')
      .eq('priority_score', priorityScore)
      .limit(1);

    if (excludeStoreId) {
      query = query.neq('id', excludeStoreId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking priority score:', error);
      return NextResponse.json(
        { error: 'Failed to check priority score' },
        { status: 500 }
      );
    }

    if (data && data.length > 0) {
      return NextResponse.json({
        exists: true,
        storeName: data[0].name,
        storeId: data[0].id
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error in check-priority-score API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
