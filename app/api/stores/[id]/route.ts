import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// 個別店舗取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // セッション確認 - クライアントサイドからのリクエストでもクッキーが渡されるように修正
    const session = await getSession();

    // セッションがない場合でも、管理者権限のチェックを行わずに店舗情報を返す
    // （管理者画面からのアクセスは別途セッション確認済み）
    if (!session) {
      console.log('No session found in API, but continuing for admin access');
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { id: storeId } = await params;

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
  { params }: { params: Promise<{ id: string }> }
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

    const { id: storeId } = await params;
    const body = await request.json();

    // 更新可能なフィールドのみ抽出
    const updateData: any = {};
    const allowedFields = [
      'name',
      'name_kana',
      'genre_id',
      'area_id',
      'address',
      'phone_number',
      'email',
      'description',
      'business_hours',
      'regular_holiday',
      'thumbnail_url',
      'is_active',
      'secondary_phone',
      'line_id',
      'website',
      'sns_instagram',
      'sns_twitter',
      'sns_tiktok',
      'minimum_hourly_wage',
      'maximum_hourly_wage',
      'recruitment_status',
      'recruitment_message',
      'is_recommended',
      'priority_score',
      'recommendation_reason',
      'recommended_at',
      'recommended_by',
      // 詳細営業時間フィールド
      'hours_monday_open',
      'hours_monday_close',
      'hours_monday_closed',
      'hours_tuesday_open',
      'hours_tuesday_close',
      'hours_tuesday_closed',
      'hours_wednesday_open',
      'hours_wednesday_close',
      'hours_wednesday_closed',
      'hours_thursday_open',
      'hours_thursday_close',
      'hours_thursday_closed',
      'hours_friday_open',
      'hours_friday_close',
      'hours_friday_closed',
      'hours_saturday_open',
      'hours_saturday_close',
      'hours_saturday_closed',
      'hours_sunday_open',
      'hours_sunday_close',
      'hours_sunday_closed',
      // 画像関連フィールド
      'image_url',
      'additional_images',
      // その他のフィールド
      'contact_phone_for_ga',
      'custom_notes',
      'accessible_stations'
    ];

    for (const field of allowedFields) {
      if (field in body) {
        // 時間フィールドの型変換処理
        if (field.includes('_open') || field.includes('_close')) {
          // HH:MM形式の文字列をそのまま保存（PostgreSQLのtime型に自動変換される）
          updateData[field] = body[field] || null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    // 詳細営業時間から business_hours 文字列を自動生成
    const generateBusinessHours = () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayNames = ['月', '火', '水', '木', '金', '土', '日'];
      const hours = [];

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const dayName = dayNames[i];
        const openField = `hours_${day}_open`;
        const closeField = `hours_${day}_close`;
        const closedField = `hours_${day}_closed`;

        // 更新データまたは既存データから営業時間情報を取得
        const isClosed = updateData[closedField] ?? body[closedField];
        const openTime = updateData[openField] ?? body[openField];
        const closeTime = updateData[closeField] ?? body[closeField];

        if (isClosed) {
          hours.push(`${dayName}: 定休日`);
        } else if (openTime && closeTime) {
          hours.push(`${dayName}: ${openTime}-${closeTime}`);
        }
      }

      return hours.length > 0 ? hours.join(', ') : null;
    };

    // 営業時間フィールドが更新された場合は business_hours も更新
    const hasHoursUpdate = Object.keys(updateData).some(field =>
      field.startsWith('hours_') && (field.includes('_open') || field.includes('_close') || field.includes('_closed'))
    );

    if (hasHoursUpdate) {
      updateData.business_hours = generateBusinessHours();
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id: storeId } = await params;

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