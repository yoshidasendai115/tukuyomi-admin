import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { getBroadcastLimit, getWeekStartDateString, getPlanName, canBroadcast } from '@/lib/broadcast-limits';

/**
 * お知らせ配信の週次制限をチェック
 * GET /api/broadcasts/check-limit?storeId=xxx
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (
      typeof storeId !== 'string' ||
      storeId.length === 0
    ) {
      return NextResponse.json(
        { error: '店舗IDが指定されていません' },
        { status: 400 }
      );
    }

    // 店舗情報を取得（プランIDを含む）
    const { data: store, error: storeError } = await supabaseAdmin
      .from('stores')
      .select('id, name, subscription_plan_id')
      .eq('id', storeId)
      .single();

    if (
      storeError !== null ||
      typeof store !== 'object' ||
      store === null
    ) {
      return NextResponse.json(
        { error: '店舗が見つかりません' },
        { status: 404 }
      );
    }

    const planId = store.subscription_plan_id;
    const weeklyLimit = getBroadcastLimit(planId);
    const planName = getPlanName(planId);
    const broadcastEnabled = canBroadcast(planId);

    // Freeプランの場合は即座に返却
    if (!broadcastEnabled) {
      return NextResponse.json({
        success: true,
        store_id: storeId,
        store_name: store.name,
        plan_id: planId,
        plan_name: planName,
        weekly_limit: 0,
        used_count: 0,
        remaining_count: 0,
        can_broadcast: false,
        week_start_date: getWeekStartDateString(),
        message: 'Freeプランではお知らせ配信機能をご利用いただけません'
      });
    }

    // 現在の週の開始日を取得
    const weekStartDate = getWeekStartDateString();

    // 現在の週の配信回数を取得
    const { data: limitData, error: limitError } = await supabaseAdmin
      .from('broadcast_weekly_limits')
      .select('broadcast_count')
      .eq('store_id', storeId)
      .eq('week_start_date', weekStartDate)
      .single();

    let usedCount = 0;
    if (limitError === null && typeof limitData === 'object' && limitData !== null) {
      usedCount = limitData.broadcast_count;
    }

    const remainingCount = Math.max(0, weeklyLimit - usedCount);
    const canBroadcastNow = remainingCount > 0;

    return NextResponse.json({
      success: true,
      store_id: storeId,
      store_name: store.name,
      plan_id: planId,
      plan_name: planName,
      weekly_limit: weeklyLimit,
      used_count: usedCount,
      remaining_count: remainingCount,
      can_broadcast: canBroadcastNow,
      week_start_date: weekStartDate,
      message: canBroadcastNow
        ? `今週はあと${remainingCount}回配信可能です`
        : '今週の配信上限に達しています'
    });
  } catch (error) {
    console.error('Error checking broadcast limit:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
