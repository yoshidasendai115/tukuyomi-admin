import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

// メッセージ一斉送信
export async function POST(request: NextRequest) {
  try {
    // 管理者セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { storeId, title, content, messageType = 'notification' } = await request.json();

    if (!storeId || !title || !content) {
      return NextResponse.json(
        { error: 'Store ID, title, and content are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // メッセージ送信関数を呼び出し
    const { data: result, error: sendError } = await supabaseAdmin
      .rpc('send_broadcast_to_favorites', {
        p_store_id: storeId,
        p_title: title,
        p_content: content,
        p_message_type: messageType
      });

    if (sendError) {
      console.error('Error sending broadcast:', sendError);
      return NextResponse.json(
        { error: 'Failed to send message', details: sendError.message },
        { status: 500 }
      );
    }

    console.log('Broadcast result:', result);

    // データベース関数はJSON型を返すので、resultは既にオブジェクト
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in broadcast-message API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// メッセージ送信履歴を取得
export async function GET(request: NextRequest) {
  try {
    // 管理者セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // broadcast_messagesテーブルから送信履歴を取得
    const { data: broadcastMessages, error: broadcastError } = await supabaseAdmin
      .from('broadcast_messages')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (broadcastError) {
      console.error('Error fetching broadcast messages:', broadcastError);
      return NextResponse.json(
        { error: 'Failed to fetch broadcast messages', details: broadcastError.message },
        { status: 500 }
      );
    }

    if (!broadcastMessages || broadcastMessages.length === 0) {
      return NextResponse.json({
        success: true,
        messages: [],
        count: 0
      });
    }

    // 各メッセージについてmessage_threadsから宛先情報を集計
    const formattedMessages = await Promise.all(
      broadcastMessages.map(async (bm) => {
        // このbroadcast_messageに関連するmessage_threadsを取得
        const { data: threads } = await supabaseAdmin
          .from('message_threads')
          .select('id, is_read')
          .eq('broadcast_message_id', bm.id);

        const total_recipients = threads?.length || 0;
        const read_count = threads?.filter(t => t.is_read).length || 0;
        const read_rate = total_recipients > 0 ? Math.round((read_count / total_recipients) * 100) : 0;

        return {
          broadcast_id: bm.id,
          broadcast_group_id: bm.broadcast_group_id,
          title: bm.title,
          content: bm.content,
          sent_at: bm.created_at,
          is_cancelled: bm.is_cancelled,
          cancellation_reason: bm.cancellation_reason,
          cancelled_at: bm.cancelled_at,
          total_recipients,
          read_rate
        };
      })
    );

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      count: formattedMessages.length
    });
  } catch (error) {
    console.error('Error in broadcast-message GET API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
