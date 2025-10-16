import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// 選択した店舗とのマッチングを確定し、申請内容を店舗情報に反映
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // セッション確認
    const session = await getSession();
    if (
      typeof session !== 'object' ||
      session === null
    ) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (
      typeof supabaseAdmin !== 'object' ||
      supabaseAdmin === null
    ) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const requestId = id;

    const body = await request.json();
    const { storeId, applyChanges } = body;

    if (
      typeof storeId !== 'string' ||
      storeId.length === 0
    ) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    // 申請情報を取得
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (
      requestError !== null ||
      typeof requestData !== 'object' ||
      requestData === null
    ) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // 申請にstore_idを設定
    const { error: updateRequestError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({ store_id: storeId })
      .eq('id', requestId);

    if (updateRequestError !== null) {
      console.error('Error updating request with store_id:', updateRequestError);
      return NextResponse.json(
        { error: '申請の更新に失敗しました' },
        { status: 500 }
      );
    }

    // 申請内容を店舗情報に反映する場合
    if (applyChanges === true) {
      const updateData: Record<string, string | number | null> = {};

      // 店舗名
      if (
        typeof requestData.store_name === 'string' &&
        requestData.store_name.length > 0
      ) {
        updateData.name = requestData.store_name;
      }

      // 住所
      if (
        typeof requestData.store_address === 'string' &&
        requestData.store_address.length > 0
      ) {
        updateData.address = requestData.store_address;
      }

      // 電話番号
      if (
        typeof requestData.store_phone === 'string' &&
        requestData.store_phone.length > 0
      ) {
        updateData.phone_number = requestData.store_phone;
      }

      // 業態
      if (
        typeof requestData.genre_id === 'string' &&
        requestData.genre_id.length > 0
      ) {
        updateData.genre_id = requestData.genre_id;
      }

      // 更新を実行
      const { error: updateStoreError } = await supabaseAdmin
        .from('stores')
        .update(updateData)
        .eq('id', storeId);

      if (updateStoreError !== null) {
        console.error('Error updating store:', updateStoreError);
        return NextResponse.json(
          { error: '店舗情報の更新に失敗しました' },
          { status: 500 }
        );
      }
    }

    // マッチした店舗情報を取得
    const { data: storeData, error: storeError } = await supabaseAdmin
      .from('stores')
      .select(`
        *,
        stations:area_id(id, name),
        genres:genre_id(id, name)
      `)
      .eq('id', storeId)
      .single();

    if (storeError !== null) {
      console.error('Error fetching matched store:', storeError);
      return NextResponse.json(
        { error: '店舗情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matched_store: storeData,
      changes_applied: applyChanges === true,
      message: applyChanges === true
        ? '店舗とのマッチングが完了し、店舗情報を更新しました'
        : '店舗とのマッチングが完了しました'
    });

  } catch (error) {
    console.error('Error in confirm match:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
