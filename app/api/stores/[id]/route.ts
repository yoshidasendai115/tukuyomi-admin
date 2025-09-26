import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// 個別店舗取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const storeId = params.id;

    // 店舗情報を取得
    const { data, error } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (error) {
      console.error('Error fetching store:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 店舗更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const storeId = params.id;
    const body = await request.json();

    // 更新可能なフィールドのみ抽出
    const updateData: any = {};
    const allowedFields = [
      'name',
      'name_kana',
      'genre',
      'area',
      'address',
      'phone',
      'email',
      'description',
      'business_hours',
      'regular_holiday',
      'thumbnail_url',
      'is_active',
      'secondary_phone',
      'line_id',
      'minimum_hourly_wage',
      'maximum_hourly_wage',
      'recruitment_status',
      'recruitment_message'
    ];

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // 更新日時を追加
    updateData.updated_at = new Date().toISOString();

    // 店舗情報を更新
    const { data, error } = await supabaseAdmin
      .from('stores')
      .update(updateData)
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating store:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 店舗削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const storeId = params.id;

    // 論理削除（is_activeをfalseに設定）
    const { data, error } = await supabaseAdmin
      .from('stores')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', storeId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting store:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '店舗を無効化しました'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}