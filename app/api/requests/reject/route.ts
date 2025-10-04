import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { requestId, rejectionReason, adminNotes } = await request.json();

    if (!requestId || !rejectionReason) {
      return NextResponse.json(
        { error: 'Request ID and rejection reason are required' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 申請を却下済みに更新
    const { error } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
        processed_by: session.userId,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('Error rejecting request:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // IPアドレスの取得
    const ip = request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown';

    // アクセスログに記録
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'request_rejected',
        details: {
          request_id: requestId,
          rejection_reason: rejectionReason,
          admin_notes: adminNotes,
          processed_by: session.userId,
          processed_by_name: session.displayName
        },
        ip_address: ip,
        user_agent: request.headers.get('user-agent') || undefined
      });

    return NextResponse.json({
      success: true,
      message: '申請を却下しました'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}