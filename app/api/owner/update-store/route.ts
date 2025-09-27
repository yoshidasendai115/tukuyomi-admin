import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, storeId, ...rawUpdateData } = body;

    // DBに存在するカラムのみをフィルタリング（存在しないカラムを除外）
    const allowedFields = [
      'name', 'area_id', 'genre_id', 'description', 'address', 'phone_number',
      'business_hours', 'regular_holiday', 'thumbnail_url', 'images',
      'is_active', 'station', 'station_line', 'station_distance',
      'google_place_id', 'google_maps_uri', 'latitude', 'longitude',
      'price_level', 'website', 'rating', 'review_count', 'area',
      'features', 'genre', 'opening_hours_text', 'tags', 'view_count',
      'owner_id', 'email', 'line_id', 'contact_phone_for_ga', 'minimum_hourly_wage', 'maximum_hourly_wage',
      'average_daily_income', 'average_monthly_income', 'work_system',
      'recruitment_status', 'treatment_benefits', 'working_conditions',
      'dress_code', 'target_age_min', 'target_age_max', 'recruitment_message',
      'store_features', 'payment_system', 'back_rate', 'dormitory_available',
      'dormitory_details', 'daycare_available', 'daycare_details', 'trial_period',
      'trial_conditions', 'interview_location', 'interview_flow', 'sns_instagram',
      'sns_twitter', 'sns_tiktok', 'last_updated_by', 'favorite_count',
      'application_count', 'plan_type', 'plan_expires_at', 'max_images_allowed',
      'verified_at', 'verified_by', 'custom_notes', 'image_url', 'additional_images',
      'accessible_stations',
      // 営業時間の詳細カラム
      'hours_monday_open', 'hours_monday_close', 'hours_monday_closed',
      'hours_tuesday_open', 'hours_tuesday_close', 'hours_tuesday_closed',
      'hours_wednesday_open', 'hours_wednesday_close', 'hours_wednesday_closed',
      'hours_thursday_open', 'hours_thursday_close', 'hours_thursday_closed',
      'hours_friday_open', 'hours_friday_close', 'hours_friday_closed',
      'hours_saturday_open', 'hours_saturday_close', 'hours_saturday_closed',
      'hours_sunday_open', 'hours_sunday_close', 'hours_sunday_closed'
    ];

    // 許可されたフィールドのみを抽出
    const updateData: any = {};
    const excludedFields: string[] = [];

    for (const field in rawUpdateData) {
      if (allowedFields.includes(field)) {
        updateData[field] = rawUpdateData[field];
      } else {
        excludedFields.push(field);
      }
    }

    // 除外されたフィールドがある場合は警告ログを出力
    if (excludedFields.length > 0) {
      console.warn('以下のフィールドはDBに存在しないため除外されました:', excludedFields);
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // トークンの有効性を再確認
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select(`
        id,
        token,
        is_active,
        admin_store_edit_requests (
          store_id
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // トークンが有効かチェック（管理者が削除しない限り永続的に利用可能）
    if (!tokenData.is_active) {
      return NextResponse.json(
        { error: 'Token has been deactivated' },
        { status: 401 }
      );
    }

    // 店舗IDを決定（リクエストから渡されたものか、トークンに関連付けられたもの）
    const targetStoreId = storeId || tokenData.admin_store_edit_requests?.store_id;

    if (!targetStoreId) {
      // 店舗がない場合は新規作成
      const { data: newStore, error: createError } = await supabaseAdmin
        .from('stores')
        .insert({
          ...updateData,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating store:', createError);
        return NextResponse.json(
          { error: 'Failed to create store' },
          { status: 500 }
        );
      }

      // 申請に店舗IDを関連付け
      await supabaseAdmin
        .from('admin_store_edit_requests')
        .update({ store_id: newStore.id })
        .eq('id', tokenData.admin_store_edit_requests?.id);

      // 新規作成の履歴を記録
      const { error: historyError } = await supabaseAdmin
        .from('store_edit_history')
        .insert({
          store_id: newStore.id,
          token_id: tokenData.id,
          edited_by: token,
          action: 'create',
          changes: null, // 新規作成なので変更はなし
          previous_values: null, // 以前の値はなし
          new_values: newStore,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });

      if (historyError) {
        console.error('Error recording creation history:', historyError);
      } else {
        console.log(`新規店舗作成履歴を記録しました: ${newStore.id}`);
      }

      return NextResponse.json({
        success: true,
        store: newStore,
        message: '店舗情報を登録しました'
      });
    }

    // 既存店舗の現在の値を取得（履歴記録用）
    const { data: currentStore, error: fetchError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', targetStoreId)
      .single();

    if (fetchError) {
      console.error('Error fetching current store:', fetchError);
    }

    // 既存店舗を更新
    const { data: updatedStore, error: updateError } = await supabaseAdmin
      .from('stores')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetStoreId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating store:', updateError);
      return NextResponse.json(
        { error: 'Failed to update store' },
        { status: 500 }
      );
    }

    // 編集履歴を記録
    if (currentStore && updatedStore) {
      // 変更されたフィールドを特定
      const changes: any = {};
      const changedFields: string[] = [];

      for (const key in updateData) {
        if (currentStore[key] !== updateData[key]) {
          changes[key] = {
            old: currentStore[key],
            new: updateData[key]
          };
          changedFields.push(key);
        }
      }

      // 履歴レコードを挿入
      if (changedFields.length > 0) {
        const { error: historyError } = await supabaseAdmin
          .from('store_edit_history')
          .insert({
            store_id: targetStoreId,
            token_id: tokenData.id,
            edited_by: token, // トークンを編集者として記録
            action: 'update',
            changes: changes,
            previous_values: currentStore,
            new_values: updatedStore,
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            user_agent: request.headers.get('user-agent') || 'unknown'
          });

        if (historyError) {
          console.error('Error recording edit history:', historyError);
          // 履歴記録に失敗しても更新自体は成功として扱う
        } else {
          console.log(`編集履歴を記録しました: ${changedFields.length}フィールドが変更されました`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      store: updatedStore,
      message: '店舗情報を更新しました'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}