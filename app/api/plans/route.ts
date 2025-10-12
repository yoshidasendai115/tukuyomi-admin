import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SubscriptionPlan, SubscriptionPlanInput } from '@/types/subscription-plan';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// プラン一覧取得（GET）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: plans, error } = await query;

    if (error) {
      console.error('[Plans API] Error fetching plans:', error);
      return NextResponse.json(
        { error: 'プランの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('[Plans API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// プラン作成（POST）
export async function POST(request: NextRequest) {
  try {
    const body: SubscriptionPlanInput = await request.json();

    // バリデーション
    if (!body.name || !body.display_name || body.price === undefined) {
      return NextResponse.json(
        { error: 'プラン名、表示名、価格は必須です' },
        { status: 400 }
      );
    }

    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .insert({
        name: body.name,
        display_name: body.display_name,
        price: body.price,
        description: body.description || null,
        features: body.features || {},
        display_order: body.display_order || 0,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single();

    if (error) {
      console.error('[Plans API] Error creating plan:', error);

      // UNIQUE制約違反のチェック
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'このプラン名は既に使用されています' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'プランの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('[Plans API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// プラン更新（PUT）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'プランIDが必要です' },
        { status: 400 }
      );
    }

    const { data: plan, error } = await supabaseAdmin
      .from('subscription_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Plans API] Error updating plan:', error);

      // UNIQUE制約違反のチェック
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'このプラン名は既に使用されています' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'プランの更新に失敗しました' },
        { status: 500 }
      );
    }

    if (!plan) {
      return NextResponse.json(
        { error: 'プランが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('[Plans API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// プラン削除（DELETE）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'プランIDが必要です' },
        { status: 400 }
      );
    }

    // このプランを使用している店舗があるかチェック
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id')
      .eq('subscription_plan_id', id)
      .limit(1);

    if (storesError) {
      console.error('[Plans API] Error checking stores:', storesError);
      return NextResponse.json(
        { error: '店舗の確認に失敗しました' },
        { status: 500 }
      );
    }

    if (stores && stores.length > 0) {
      return NextResponse.json(
        { error: 'このプランは店舗で使用されているため削除できません' },
        { status: 409 }
      );
    }

    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Plans API] Error deleting plan:', error);
      return NextResponse.json(
        { error: 'プランの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'プランを削除しました' });
  } catch (error) {
    console.error('[Plans API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}
