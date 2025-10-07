import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // store_ownerは口コミ通報管理にアクセスできない
    if (session.role === 'store_owner') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      console.error('[review-reports] Supabase admin client not initialized');
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    // 通報一覧を取得（レビュー、店舗情報をJOIN）
    let query = supabaseAdmin
      .from('review_reports')
      .select(`
        *,
        review:reviews (
          id,
          title,
          content,
          rating,
          created_at,
          reviewer_nickname,
          reviewer_type,
          store:stores (
            id,
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    // ステータスフィルター
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[review-reports] Query error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('[review-reports] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // store_ownerは口コミ通報を処理できない
    if (session.role === 'store_owner') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      console.error('[review-reports] Supabase admin client not initialized');
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { id, status, resolution_note, delete_review } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // ステータスのバリデーション
    if (!['resolved', 'dismissed', 'reviewing'].includes(status)) {
      return NextResponse.json(
        { error: '無効なステータスです' },
        { status: 400 }
      );
    }

    // 通報情報を取得
    const { data: reportData, error: fetchError } = await supabaseAdmin
      .from('review_reports')
      .select('*, review:reviews(id)')
      .eq('id', id)
      .single();

    if (fetchError || !reportData) {
      console.error('[review-reports] Report not found:', fetchError);
      return NextResponse.json(
        { error: '通報が見つかりません' },
        { status: 404 }
      );
    }

    // 通報ステータスを更新
    const updateData: Record<string, unknown> = {
      status,
      resolution_note,
      resolved_at: new Date().toISOString(),
      resolved_by: session.userId
    };

    const { error: updateError } = await supabaseAdmin
      .from('review_reports')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('[review-reports] Update error:', updateError);
      return NextResponse.json(
        { error: '通報の更新に失敗しました' },
        { status: 500 }
      );
    }

    // 承認かつレビュー削除オプションが有効な場合、レビューを論理削除
    if (status === 'resolved' && delete_review && reportData.review) {
      const { error: deleteError } = await supabaseAdmin
        .from('reviews')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: session.userId,
          deletion_reason: `通報承認による削除 (通報ID: ${id})`
        })
        .eq('id', reportData.review_id);

      if (deleteError) {
        console.error('[review-reports] Review deletion error:', deleteError);
        // レビュー削除に失敗してもエラーにはしない（通報処理は成功）
      }
    }

    return NextResponse.json({
      message: '通報を処理しました',
      deleted_review: status === 'resolved' && delete_review
    });
  } catch (error) {
    console.error('[review-reports] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : '予期しないエラーが発生しました';
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}
