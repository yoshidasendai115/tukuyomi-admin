import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    console.log('Received token validation request for:', token);

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

    // トークンの有効性を確認
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select(`
        id,
        token,
        request_id,
        expires_at,
        is_active,
        use_count,
        max_uses,
        admin_store_edit_requests (
          id,
          store_id
        )
      `)
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.log('Token lookup error:', tokenError);
      console.log('Token data:', tokenData);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('Found token data:', {
      id: tokenData.id,
      is_active: tokenData.is_active,
      request_id: tokenData.request_id,
      store_id: tokenData.admin_store_edit_requests?.store_id
    });

    // トークンが有効かチェック（管理者が削除しない限り永続的に利用可能）
    if (!tokenData.is_active) {
      return NextResponse.json(
        { error: 'Token has been deactivated' },
        { status: 401 }
      );
    }

    // 有効期限と使用回数制限のチェックを削除（永続的に利用可能）

    // 関連する店舗情報を取得
    const storeId = tokenData.admin_store_edit_requests?.store_id;

    if (!storeId) {
      // 店舗がまだ関連付けられていない場合は、申請情報から店舗を検索
      const { data: requestData } = await supabaseAdmin
        .from('admin_store_edit_requests')
        .select('*')
        .eq('id', tokenData.request_id)
        .single();

      if (requestData) {
        // 店舗名と電話番号で店舗を検索
        const { data: stores } = await supabaseAdmin
          .from('stores')
          .select('*')
          .eq('name', requestData.store_name)
          .eq('phone_number', requestData.store_phone);

        if (stores && stores.length > 0) {
          // 店舗が見つかった場合は返す
          return NextResponse.json({ store: stores[0] });
        }
      }

      // 店舗が見つからない場合は空で返す
      return NextResponse.json({ store: null });
    }

    // 店舗情報を取得
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // 使用回数のカウントアップを削除（永続的に利用可能なため不要）

    return NextResponse.json({ store });
  } catch (error) {
    console.error('Error validating token:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}