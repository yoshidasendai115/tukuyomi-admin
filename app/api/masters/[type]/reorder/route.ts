import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
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

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'items配列が必要です' },
        { status: 400 }
      );
    }

    const { type } = await params;
    const tableName = type;

    // 有効なテーブル名かチェック
    if (!['areas', 'genres'].includes(tableName)) {
      return NextResponse.json(
        { error: '無効なテーブル名です' },
        { status: 400 }
      );
    }

    // 各アイテムの表示順を更新
    const updates = items.map((item: { id: string; display_order: number }) =>
      supabaseAdmin!
        .from(tableName)
        .update({ display_order: item.display_order })
        .eq('id', item.id)
    );

    const results = await Promise.all(updates);

    // エラーチェック
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Error updating order:', errors);
      return NextResponse.json(
        { error: '表示順の更新に失敗しました' },
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