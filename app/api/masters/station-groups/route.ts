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
          station_id
        )
      `)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching station groups:', error);
      return NextResponse.json({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      {
        message: '予期しないエラーが発生しました',
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
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

    // 重複チェック: グループIDの重複
    const { data: existingByName } = await supabaseAdmin
      .from('station_groups')
      .select('id, name')
      .eq('name', name)
      .single();

    if (existingByName) {
      return NextResponse.json(
        { error: `グループID「${name}」は既に使用されています` },
        { status: 400 }
      );
    }

    // 重複チェック: 表示名の重複
    const { data: existingByDisplayName } = await supabaseAdmin
      .from('station_groups')
      .select('id, name, display_name')
      .eq('display_name', display_name);

    if (existingByDisplayName && existingByDisplayName.length > 0) {
      return NextResponse.json(
        {
          error: `表示名「${display_name}」は既に使用されています`,
          existing: existingByDisplayName.map(g => g.name)
        },
        { status: 400 }
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
      const members = member_area_ids.map((station_id: string) => ({
        group_id: groupData.id,
        station_id
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
          station_id
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

    // 重複チェック: グループID（自分自身を除く）
    const { data: existingByName } = await supabaseAdmin
      .from('station_groups')
      .select('id, name')
      .eq('name', name)
      .neq('id', id)
      .single();

    if (existingByName) {
      return NextResponse.json(
        { error: `グループID「${name}」は既に他のグループで使用されています` },
        { status: 400 }
      );
    }

    // 重複チェック: 表示名（自分自身を除く）
    const { data: existingByDisplayName } = await supabaseAdmin
      .from('station_groups')
      .select('id, name, display_name')
      .eq('display_name', display_name)
      .neq('id', id);

    if (existingByDisplayName && existingByDisplayName.length > 0) {
      return NextResponse.json(
        {
          error: `表示名「${display_name}」は既に他のグループで使用されています`,
          existing: existingByDisplayName.map(g => g.name)
        },
        { status: 400 }
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
      const members = member_area_ids.map((station_id: string) => ({
        group_id: id,
        station_id
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
          station_id
        )
      `)
      .eq('id', id)
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