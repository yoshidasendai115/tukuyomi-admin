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

    const { requestId, adminNotes } = await request.json();

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

    // トークン生成
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30日後に期限切れ

    // URLを生成
    const url = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002'}/owner/edit/${token}`;

    // 申請を承認済みに更新
    const { error: updateError } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
        processed_by: session.userId
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // トークンを保存
    const { error: tokenError } = await supabaseAdmin
      .from('admin_store_edit_tokens')
      .insert({
        request_id: requestId,
        token: token,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (tokenError) {
      console.error('Error saving token:', tokenError);
      // トークン保存に失敗しても、申請は承認済みとして処理を続ける
    }

    return NextResponse.json({
      data: {
        token,
        url,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}