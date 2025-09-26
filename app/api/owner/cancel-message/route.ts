import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { broadcastId, storeId, token, reason } = await request.json();

    if (!broadcastId || !storeId || !token) {
      return NextResponse.json(
        { error: 'Broadcast ID, Store ID, and token are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // トークンの検証
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .select('id, store_id, is_active')
      .eq('token', token)
      .eq('store_id', storeId)
      .single();

    if (tokenError || !tokenData || !tokenData.is_active) {
      return NextResponse.json(
        { error: 'Invalid or inactive token' },
        { status: 401 }
      );
    }

    // メッセージ取り消し関数を呼び出し
    const { data: result, error: cancelError } = await supabaseAdmin
      .rpc('cancel_broadcast_message', {
        p_broadcast_id: broadcastId,
        p_token: token,
        p_reason: reason || null
      });

    if (cancelError) {
      console.error('Error cancelling broadcast:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel message', details: cancelError.message },
        { status: 500 }
      );
    }

    // 関数の結果を確認
    if (result && !result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to cancel message' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in cancel-message API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}