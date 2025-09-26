import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// GET: 駅グループ一覧取得
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
      .from('station_groups')
      .select(`
        *,
        station_group_members (
          id,
          area_id
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching station groups:', error);
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

// POST: 駅グループ新規作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, display_name, is_major_terminal, description, member_area_ids } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'グループIDと表示名は必須です' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // グループを作成
    const { data: groupData, error: groupError } = await supabaseAdmin
      .from('station_groups')
      .insert({
        name,
        display_name,
        is_major_terminal: is_major_terminal || false,
        description
      })
      .select()
      .single();

    if (groupError) {
      console.error('Error creating station group:', groupError);
      return NextResponse.json({ error: groupError.message }, { status: 500 });
    }

    // メンバーを追加
    if (member_area_ids && member_area_ids.length > 0) {
      const members = member_area_ids.map((area_id: string) => ({
        group_id: groupData.id,
        area_id
      }));

      const { error: memberError } = await supabaseAdmin
        .from('station_group_members')
        .insert(members);

      if (memberError) {
        console.error('Error adding members:', memberError);
        // メンバー追加に失敗してもグループ作成は成功とする
      }
    }

    const { data, error } = await supabaseAdmin
      .from('station_groups')
      .select(`
        *,
        station_group_members (
          id,
          area_id
        )
      `)
      .eq('id', groupData.id)
      .single();

    if (error) {
      console.error('Error creating station group:', error);
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

// PUT: 駅グループ更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, display_name, is_major_terminal, description, member_area_ids } = body;

    if (!id || !name || !display_name) {
      return NextResponse.json(
        { error: 'ID、グループID、表示名は必須です' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // グループを更新
    const { error: updateError } = await supabaseAdmin
      .from('station_groups')
      .update({
        name,
        display_name,
        is_major_terminal,
        description
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating station group:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 既存のメンバーを削除
    const { error: deleteError } = await supabaseAdmin
      .from('station_group_members')
      .delete()
      .eq('group_id', id);

    if (deleteError) {
      console.error('Error deleting old members:', deleteError);
    }

    // 新しいメンバーを追加
    if (member_area_ids && member_area_ids.length > 0) {
      const members = member_area_ids.map((area_id: string) => ({
        group_id: id,
        area_id
      }));

      const { error: memberError } = await supabaseAdmin
        .from('station_group_members')
        .insert(members);

      if (memberError) {
        console.error('Error adding members:', memberError);
      }
    }

    const { data, error } = await supabaseAdmin
      .from('station_groups')
      .select(`
        *,
        station_group_members (
          id,
          area_id
        )
      `)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating station group:', error);
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

// DELETE: 駅グループ削除
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
      .from('station_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting station group:', error);
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