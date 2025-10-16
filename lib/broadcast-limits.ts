/**
 * お知らせ配信の週次制限に関するユーティリティ関数
 */

import { supabaseAdmin } from './supabase';

/**
 * 指定した日付の週の開始日（月曜日）を取得
 * @param date 基準日（デフォルト: 現在日時）
 * @returns 週の開始日（月曜日 00:00:00）
 */
export function getWeekStartDate(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
  const diff = day === 0 ? -6 : 1 - day; // 月曜日までの日数差
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0); // 00:00:00にリセット
  return d;
}

/**
 * 週の開始日をYYYY-MM-DD形式の文字列に変換
 * @param date 基準日（デフォルト: 現在日時）
 * @returns YYYY-MM-DD形式の文字列
 */
export function getWeekStartDateString(date: Date = new Date()): string {
  const weekStart = getWeekStartDate(date);
  return weekStart.toISOString().split('T')[0];
}

/**
 * プランIDから週次配信上限を取得
 * @param planId プランID（subscription_plans.id）
 * @returns 週次配信上限回数（Freeは0、ライト/ベーシック/プレミアム5は3、プレミアム10/15は5）
 */
export function getBroadcastLimit(planId: number | null | undefined): number {
  if (typeof planId !== 'number') {
    return 0; // プランIDがnull/undefinedの場合は0
  }

  switch (planId) {
    case 0: // Free
      return 0;
    case 1: // ライト
    case 2: // ベーシック
    case 3: // プレミアム5
      return 3;
    case 4: // プレミアム10
    case 5: // プレミアム15
      return 5;
    default:
      return 0;
  }
}

/**
 * プランIDからプラン名を取得
 * @param planId プランID
 * @returns プラン名
 */
export function getPlanName(planId: number | null | undefined): string {
  if (typeof planId !== 'number') {
    return 'Free';
  }

  const planNames: Record<number, string> = {
    0: 'Free',
    1: 'ライト',
    2: 'ベーシック',
    3: 'プレミアム5',
    4: 'プレミアム10',
    5: 'プレミアム15',
  };

  return planNames[planId] || 'Free';
}

/**
 * お知らせ配信が可能かどうかを判定
 * @param planId プランID
 * @returns 配信可能ならtrue、不可ならfalse
 */
export function canBroadcast(planId: number | null | undefined): boolean {
  return getBroadcastLimit(planId) > 0;
}

/**
 * 週次制限テーブルを初期化（ログイン時に実行）
 * 古い週のレコードを削除し、現在の週のレコードを作成
 * @param storeId 店舗ID
 * @returns 処理結果
 */
export async function initializeWeeklyLimit(storeId: string): Promise<{ success: boolean; error: string | null }> {
  if (
    typeof supabaseAdmin !== 'object' ||
    supabaseAdmin === null
  ) {
    return { success: false, error: 'Supabase設定エラー' };
  }

  try {
    const weekStartDate = getWeekStartDateString();

    // 現在の週より前の古いレコードを削除
    const { error: deleteError } = await supabaseAdmin
      .from('broadcast_weekly_limits')
      .delete()
      .eq('store_id', storeId)
      .lt('week_start_date', weekStartDate);

    if (deleteError !== null) {
      console.error('[initializeWeeklyLimit] Delete error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // 現在の週のレコードが存在するか確認
    const { data: existing, error: selectError } = await supabaseAdmin
      .from('broadcast_weekly_limits')
      .select('id')
      .eq('store_id', storeId)
      .eq('week_start_date', weekStartDate)
      .single();

    if (selectError !== null && selectError.code !== 'PGRST116') {
      // PGRST116 はレコードが見つからない場合のエラーコード（正常）
      console.error('[initializeWeeklyLimit] Select error:', selectError);
      return { success: false, error: selectError.message };
    }

    // 現在の週のレコードが存在しない場合は作成
    if (existing === null) {
      const { error: insertError } = await supabaseAdmin
        .from('broadcast_weekly_limits')
        .insert({
          store_id: storeId,
          week_start_date: weekStartDate,
          broadcast_count: 0
        });

      if (insertError !== null) {
        console.error('[initializeWeeklyLimit] Insert error:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[initializeWeeklyLimit] Unexpected error:', error);
    return { success: false, error: error instanceof Error ? error.message : '予期しないエラー' };
  }
}
