import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

/**
 * DELETE /api/requests/[id]
 * 却下された申請を物理削除
 */
export async function DELETE(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      typeof supabaseAdmin !== 'object' ||
      supabaseAdmin === null
    ) {
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { id } = await params;

    if (
      typeof id !== 'string' ||
      id.length === 0
    ) {
      return NextResponse.json(
        { error: 'リクエストIDが指定されていません' },
        { status: 400 }
      );
    }

    // 申請データを取得して却下済みか確認
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('id, status, store_name')
      .eq('id', id)
      .single();

    if (fetchError !== null) {
      console.error('Error fetching request:', fetchError);
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    if (
      typeof requestData !== 'object' ||
      requestData === null
    ) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    // 却下済みの申請のみ削除可能
    if (requestData.status !== 'rejected') {
      return NextResponse.json(
        { error: '却下された申請のみ削除できます' },
        { status: 400 }
      );
    }

    // 物理削除
    const { error: deleteError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .delete()
      .eq('id', id);

    if (deleteError !== null) {
      console.error('Error deleting request:', deleteError);
      return NextResponse.json(
        { error: '削除に失敗しました' },
        { status: 500 }
      );
    }

    // アクセスログに記録
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'request_deleted',
        details: {
          request_id: id,
          store_name: requestData.store_name,
          admin_user: session.loginId
        },
        ip_address: request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown',
        user_agent: request.headers.get('user-agent') || undefined
      });

    return NextResponse.json(
      { success: true, message: '申請を削除しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in DELETE /api/requests/[id]:', error);
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}
