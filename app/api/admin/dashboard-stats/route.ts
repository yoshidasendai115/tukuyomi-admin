import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
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

    // 申請統計
    const { count: pendingCount } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: approvedCount } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved');

    // 店舗数
    const { count: storeCount } = await supabaseAdmin
      .from('stores')
      .select('id', { count: 'exact', head: true });

    // subscription_plansテーブルから全プラン取得
    const { data: plansData } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, name, display_name')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    // 各プランの店舗数を取得
    const planStats = await Promise.all(
      (plansData || []).map(async (plan) => {
        const { count } = await supabaseAdmin
          .from('stores')
          .select('id', { count: 'exact', head: true })
          .eq('subscription_plan_id', plan.id);

        return {
          planId: plan.id,
          planName: plan.name,
          displayName: plan.display_name,
          count: count || 0,
        };
      })
    );

    // 口コミ通報の未対応件数
    const { count: reviewReportsCount } = await supabaseAdmin
      .from('review_reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // プラン期限切れ店舗数
    const now = new Date().toISOString();
    const { count: expiredStoresCount } = await supabaseAdmin
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .neq('subscription_plan_id', 0)
      .not('plan_expires_at', 'is', null)
      .lt('plan_expires_at', now);

    return NextResponse.json({
      pendingRequests: pendingCount || 0,
      approvedRequests: approvedCount || 0,
      totalStores: storeCount || 0,
      planStats,
      pendingReviewReports: reviewReportsCount || 0,
      expiredStores: expiredStoresCount || 0,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
