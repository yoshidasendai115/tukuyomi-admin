import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { storeId, token, title, content, messageType = 'notification' } = await request.json();

    if (!storeId || !token || !title || !content) {
      return NextResponse.json(
        { error: 'Store ID, token, title, and content are required' },
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

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error in send-message API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// メッセージ送信履歴を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const token = searchParams.get('token');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!storeId || !token) {
      return NextResponse.json(
        { error: 'Store ID and token are required' },
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

    // メッセージ送信履歴を取得
    const { data: history, error: historyError } = await supabaseAdmin
      .rpc('get_store_broadcast_history', {
        p_store_id: storeId,
        p_limit: limit,
        p_offset: offset
      });

    if (historyError) {
      console.error('Error fetching broadcast history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch message history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      history: history || []
    });
  } catch (error) {
    console.error('Error in send-message GET API:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}