import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// GET: 駅一覧取得
export async function GET(request: NextRequest) {
  try {
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

    const { data, error } = await supabaseAdmin
      .from('stations')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching stations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST: 駅新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, display_order, is_major, is_within_tokyo23, latitude, longitude, index_letter, railway_lines, line_orders } = body;

    if (!name) {
      return NextResponse.json(
        { error: '駅名は必須です' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('stations')
      .insert({
        name,
        display_order: display_order || 0,
        is_major: is_major || false,
        is_within_tokyo23: is_within_tokyo23 !== undefined ? is_within_tokyo23 : true,
        latitude,
        longitude,
        index_letter,
        railway_lines: railway_lines || [],
        line_orders: line_orders || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating station:', error);
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

// PUT: 駅更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, display_order, is_major, is_within_tokyo23, latitude, longitude, index_letter, railway_lines, line_orders } = body;

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

    const { data, error } = await supabaseAdmin
      .from('stations')
      .update({
        name,
        display_order,
        is_major: is_major !== undefined ? is_major : false,
        is_within_tokyo23: is_within_tokyo23 !== undefined ? is_within_tokyo23 : true,
        latitude,
        longitude,
        index_letter,
        railway_lines: railway_lines || [],
        line_orders: line_orders || {}
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating station:', error);
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

// DELETE: 駅削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

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
      .from('stations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting station:', error);
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