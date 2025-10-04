import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// メッセージ取り消し
export async function POST(request: NextRequest) {
  try {
    // 管理者セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { broadcastId, reason } = await request.json();

    if (!broadcastId) {
      return NextResponse.json(
        { error: 'Broadcast ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // メッセージを取り消し
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        is_cancelled: true,
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString()
      })
      .eq('id', broadcastId);

    if (updateError) {
      console.error('Error cancelling message:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel message', details: updateError.message },
        { status: 500 }
      );
    }

    // 影響を受けたユーザー数は1（このメッセージを受け取ったユーザー）
    return NextResponse.json({
      success: true,
      affected_users: 1
    });
  } catch (error) {
    console.error('Error in cancel-message API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
