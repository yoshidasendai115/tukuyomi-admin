import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// PUT: エリア更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    console.log('Received update data:', body); // デバッグ用
    const { name, display_order, is_major, is_within_tokyo23, latitude, longitude, index_letter, railway_lines, line_orders } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: 'IDと駅名は必須です' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const updateData: any = {
      name,
      display_order,
      latitude,
      longitude,
      index_letter,
      railway_lines: railway_lines || [],
      line_orders: line_orders || {}
      // updated_at カラムは存在しないため削除
    };

    // boolean値は明示的にセット（undefinedの場合はデフォルト値を使用）
    if (is_major !== undefined) {
      updateData.is_major = is_major;
      console.log('Setting is_major to:', is_major); // デバッグ用
    }
    if (is_within_tokyo23 !== undefined) {
      updateData.is_within_tokyo23 = is_within_tokyo23;
    }

    console.log('Final update data:', updateData); // デバッグ用

    const { data, error } = await supabaseAdmin
      .from('areas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating area:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE: エリア削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: 'IDは必須です' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('areas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting area:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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