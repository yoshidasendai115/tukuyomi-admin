import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { requestId, verificationStatus, verificationNotes } = body;

    if (!requestId || !verificationStatus) {
      return NextResponse.json(
        { error: '申請IDと確認ステータスは必須です' },
        { status: 400 }
      );
    }

    if (!['verified', 'rejected'].includes(verificationStatus)) {
      return NextResponse.json(
        { error: '無効な確認ステータスです' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 書類確認ステータスを更新
    const { data, error } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .update({
        document_verification_status: verificationStatus,
        verification_notes: verificationNotes,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('Error updating verification status:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '書類確認ステータスを更新しました',
      data
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}