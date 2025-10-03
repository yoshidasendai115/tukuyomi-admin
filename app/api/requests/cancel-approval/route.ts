import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { requestId, reason } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: 'Request ID is required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 申請の現在の状態を確認
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json(
        { error: '申請が見つかりません' },
        { status: 404 }
      );
    }

    if (currentRequest.status !== 'approved') {
      return NextResponse.json(
        { error: '承認済みの申請のみ取り消し可能です' },
        { status: 400 }
      );
    }

    // 申請を「却下」状態に更新
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason || '管理者により承認が取り消されました',
        admin_notes: `承認取り消し: ${new Date().toISOString()} - ${reason || '理由未記載'}`,
        processed_by: session.userId,
        processed_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to cancel approval:', updateError);
      return NextResponse.json(
        { error: '承認取り消しに失敗しました' },
        { status: 500 }
      );
    }

    // TODO: Phase 6で実装 - 発行済みアカウントの無効化処理

    return NextResponse.json({
      success: true,
      message: '承認を取り消しました',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error canceling approval:', error);
    return NextResponse.json(
      { message: '承認取り消し中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
