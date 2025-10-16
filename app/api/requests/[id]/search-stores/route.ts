import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// 申請情報を元に一部一致する複数の店舗候補を検索
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

    // 申請情報を取得
    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('id, store_name, store_address, store_phone')
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

    // 店舗名での部分一致検索
    const nameSearchTerms = requestData.store_name
      .split(/[\s　]+/)
      .filter((term: string) => term.length > 0);

    // 住所での部分一致検索
    const addressSearchTerms = requestData.store_address
      .split(/[\s　]+/)
      .filter((term: string) => term.length > 0);

    // 電話番号の正規化（ハイフンを除去）
    const normalizedPhone = requestData.store_phone.replace(/[-\s]/g, '');

    // 全店舗を取得してクライアント側でマッチング
    const { data: allStores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select(`
        *,
        stations:area_id(id, name),
        genres:genre_id(id, name)
      `);

    if (storesError !== null) {
      console.error('Error fetching stores:', storesError);
      return NextResponse.json(
        { error: '店舗情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // マッチングスコアを計算（100%ベース）
    const candidates = (allStores || []).map((store) => {
      let matchCount = 0;
      let totalFields = 3; // 店舗名、住所、電話番号の3項目
      const matchDetails: string[] = [];

      // 店舗名の一致度
      if (store.name === requestData.store_name) {
        matchCount += 1;
        matchDetails.push('店舗名: 完全一致');
      } else {
        const nameMatches = nameSearchTerms.filter((term: string) =>
          store.name.includes(term)
        );
        if (nameMatches.length > 0) {
          // 部分一致は0.3点として計算
          matchCount += 0.3;
          matchDetails.push(`店舗名: 部分一致 (${nameMatches.length}/${nameSearchTerms.length})`);
        }
      }

      // 住所の一致度
      const storeAddress = store.address || '';
      if (storeAddress === requestData.store_address) {
        matchCount += 1;
        matchDetails.push('住所: 完全一致');
      } else if (storeAddress.length > 0) {
        const addressMatches = addressSearchTerms.filter((term: string) =>
          storeAddress.includes(term)
        );
        if (addressMatches.length > 0) {
          // 部分一致は0.3点として計算
          matchCount += 0.3;
          matchDetails.push(`住所: 部分一致 (${addressMatches.length}/${addressSearchTerms.length})`);
        }
      }

      // 電話番号の一致度
      const storePhone = (store.phone_number || '').replace(/[-\s]/g, '');
      if (storePhone === normalizedPhone) {
        matchCount += 1;
        matchDetails.push('電話番号: 完全一致');
      } else if (storePhone.length > 0 && normalizedPhone.length > 0) {
        // 下4桁が一致は0.2点として計算
        if (
          storePhone.slice(-4) === normalizedPhone.slice(-4) &&
          storePhone.length >= 4
        ) {
          matchCount += 0.2;
          matchDetails.push('電話番号: 下4桁一致');
        }
      }

      // パーセンテージスコア（0-100%）
      const score = Math.round((matchCount / totalFields) * 100);

      return {
        store,
        score,
        matchDetails
      };
    }).filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 上位10件まで

    return NextResponse.json({
      success: true,
      candidates: candidates.map((c) => ({
        ...c.store,
        match_score: c.score,
        match_details: c.matchDetails
      })),
      request_data: requestData
    });

  } catch (error) {
    console.error('Error in store search:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
