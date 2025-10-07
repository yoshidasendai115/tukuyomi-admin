import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// 8桁のランダムパスワードを生成
function generatePassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, adminNotes } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 申請データを取得
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // store_idが未設定または店舗が存在しない場合は新規作成
    let storeId = requestData.store_id;

    if (!storeId) {
      console.log('[Approve] store_id is null, creating new store');

      // 住所から緯度経度を取得
      let latitude = null;
      let longitude = null;
      if (requestData.store_address) {
        try {
          const geocodeUrl = new URL('/api/maps/geocode', request.url);
          geocodeUrl.searchParams.set('address', requestData.store_address);

          const geocodeResponse = await fetch(geocodeUrl.toString());
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            latitude = geocodeData.lat;
            longitude = geocodeData.lng;
            console.log('[Approve] Geocoded address:', geocodeData.formatted_address);
          }
        } catch (error) {
          console.error('[Approve] Geocoding error:', error);
        }
      }

      // 新規店舗を作成
      const { data: newStore, error: storeError } = await supabaseAdmin
        .from('stores')
        .insert({
          name: requestData.store_name,
          address: requestData.store_address,
          phone_number: requestData.store_phone,
          genre_id: requestData.genre_id || null,
          email: requestData.applicant_email,
          is_active: true,
          priority_score: 0,
          plan_type: 'free',
          latitude,
          longitude
        })
        .select('id')
        .single();

      if (storeError || !newStore) {
        console.error('Error creating store:', storeError);
        return NextResponse.json(
          { error: '店舗の作成に失敗しました: ' + (storeError?.message || '不明なエラー') },
          { status: 500 }
        );
      }

      storeId = newStore.id;
      console.log('[Approve] Created new store:', storeId);

      // 申請レコードのstore_idを更新
      await supabaseAdmin
        .from('admin_store_edit_requests')
        .update({ store_id: storeId })
        .eq('id', requestId);
    } else {
      // store_idが設定されている場合、storesテーブルに存在するか確認
      const { data: existingStore, error: checkError } = await supabaseAdmin
        .from('stores')
        .select('id')
        .eq('id', storeId)
        .single();

      if (checkError || !existingStore) {
        console.log('[Approve] store_id exists but store not found, creating new store');

        // 住所から緯度経度を取得
        let latitude = null;
        let longitude = null;
        if (requestData.store_address) {
          try {
            const geocodeUrl = new URL('/api/maps/geocode', request.url);
            geocodeUrl.searchParams.set('address', requestData.store_address);

            const geocodeResponse = await fetch(geocodeUrl.toString());
            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json();
              latitude = geocodeData.lat;
              longitude = geocodeData.lng;
              console.log('[Approve] Geocoded address:', geocodeData.formatted_address);
            }
          } catch (error) {
            console.error('[Approve] Geocoding error:', error);
          }
        }

        // 店舗が存在しない場合は新規作成
        const { data: newStore, error: storeError } = await supabaseAdmin
          .from('stores')
          .insert({
            id: storeId, // 既存のUUIDを使用
            name: requestData.store_name,
            address: requestData.store_address,
            phone_number: requestData.store_phone,
            genre_id: requestData.genre_id || null,
            email: requestData.applicant_email,
            is_active: true,
            priority_score: 0,
            plan_type: 'free',
            latitude,
            longitude
          })
          .select('id')
          .single();

        if (storeError || !newStore) {
          console.error('Error creating store with existing ID:', storeError);
          return NextResponse.json(
            { error: '店舗の作成に失敗しました: ' + (storeError?.message || '不明なエラー') },
            { status: 500 }
          );
        }

        console.log('[Approve] Created store with existing ID:', storeId);
      }
    }

    // 既存ユーザーをチェック
    const { data: existingUser, error: checkUserError } = await supabaseAdmin
      .from('admin_auth_users')
      .select('id, login_id, assigned_store_id')
      .eq('login_id', requestData.applicant_email)
      .single();

    let plainPassword: string;
    let newUser;

    if (existingUser) {
      console.log('[Approve] User already exists, updating assigned_store_id');

      // 既存ユーザーのassigned_store_idを更新
      const { data: updatedUser, error: updateUserError } = await supabaseAdmin
        .from('admin_auth_users')
        .update({
          assigned_store_id: storeId,
          is_active: true
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (updateUserError) {
        console.error('Error updating user:', updateUserError);
        return NextResponse.json(
          { error: 'ユーザー情報の更新に失敗しました: ' + updateUserError.message },
          { status: 500 }
        );
      }

      // 既存のパスワードは変更しない（パスワードリセット機能を使用）
      plainPassword = '[既存アカウント - パスワードは変更されていません]';
      newUser = updatedUser;
    } else {
      console.log('[Approve] Creating new user account');

      // 8桁のランダムパスワードを生成
      plainPassword = generatePassword(8);
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // アカウントを作成（メールアドレスをログインIDとして使用）
      const { data: createdUser, error: userError } = await supabaseAdmin
        .from('admin_auth_users')
        .insert({
          login_id: requestData.applicant_email,
          password_hash: hashedPassword,
          display_name: requestData.applicant_name,
          role: 'store_owner',
          assigned_store_id: storeId,
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        return NextResponse.json(
          { error: 'アカウント作成に失敗しました: ' + userError.message },
          { status: 500 }
        );
      }

      newUser = createdUser;
    }

    // 申請を承認済みに更新（生成したパスワードも保存）
    const { error: updateError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        processed_by: session.userId,
        processed_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        generated_password: plainPassword
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      // ユーザー作成はロールバックしない（手動で削除可能）
      return NextResponse.json(
        { error: '申請更新に失敗しました' },
        { status: 500 }
      );
    }

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // アクセスログに記録
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'request_approved',
        details: {
          request_id: requestId,
          store_id: requestData.store_id,
          applicant_email: requestData.applicant_email,
          processed_by: session.userId,
          processed_by_name: session.displayName
        },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined
      });

    return NextResponse.json({
      success: true,
      message: '申請を承認しました',
      credentials: {
        loginId: requestData.applicant_email,
        password: plainPassword,
        displayName: requestData.applicant_name
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}