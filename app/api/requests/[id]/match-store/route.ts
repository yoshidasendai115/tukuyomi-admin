import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// 特定の申請に対して店舗マッチングを実行
export async function POST(
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

    const requestId = params.id;

    // 申請情報を取得
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('id, store_name, store_address')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // find_matching_store関数を使用して店舗をマッチング
    const { data: matchResult, error: matchError } = await supabaseAdmin
      .rpc('find_matching_store', {
        p_store_name: requestData.store_name,
        p_store_address: requestData.store_address
      });

    if (matchError) {
      console.error('Error finding matching store:', matchError);
      return NextResponse.json(
        { error: 'マッチング処理でエラーが発生しました' },
        { status: 500 }
      );
    }

    if (matchResult) {
      // マッチした店舗IDで申請を更新
      const { error: updateError } = await supabaseAdmin
        .from('admin_store_edit_requests')
        .update({ store_id: matchResult })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request with store_id:', updateError);
        return NextResponse.json(
          { error: '申請の更新に失敗しました' },
          { status: 500 }
        );
      }

      // マッチした店舗情報を取得
      const { data: storeData, error: storeError } = await supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', matchResult)
        .single();

      if (storeError) {
        console.error('Error fetching matched store:', storeError);
        return NextResponse.json(
          { error: '店舗情報の取得に失敗しました' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        matched_store_id: matchResult,
        matched_store: storeData,
        message: '店舗とのマッチングが完了しました'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'マッチする店舗が見つかりませんでした'
      });
    }

  } catch (error) {
    console.error('Error in store matching:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 申請と店舗のマッチング状態を確認
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

    const requestId = params.id;

    // 申請と関連する店舗情報を取得
    const { data, error } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select(`
        *,
        related_store:store_id(*)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('Error fetching request with store:', error);
      return NextResponse.json(
        { error: '申請情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching request:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}