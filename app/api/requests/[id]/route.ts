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
      .select('id, status, store_name, applicant_email')
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

    // 関連するadmin_auth_usersの削除チェック
    let deletedUser = false;
    if (
      typeof requestData.applicant_email === 'string' &&
      requestData.applicant_email.length > 0
    ) {
      try {
        // 同じメールアドレスで承認済みの申請が他にあるかチェック
        const { data: approvedRequests, error: approvedError } = await supabaseAdmin
          .from('admin_store_edit_requests')
          .select('id')
          .eq('applicant_email', requestData.applicant_email)
          .eq('status', 'approved')
          .limit(1);

        if (approvedError !== null) {
          console.error('[Delete] Error checking approved requests:', approvedError);
        }

        // 承認済み申請がない場合のみユーザーを削除
        if (
          typeof approvedRequests === 'object' &&
          approvedRequests !== null &&
          (approvedRequests.length === 0 || approvedRequests.length === undefined)
        ) {
          const { data: user, error: userError } = await supabaseAdmin
            .from('admin_auth_users')
            .select('id, role')
            .eq('login_id', requestData.applicant_email)
            .single();

          if (userError !== null) {
            console.log('[Delete] No user found or error:', userError.message);
          }

          // store_ownerロールのみ削除対象
          if (
            typeof user === 'object' &&
            user !== null &&
            user.role === 'store_owner'
          ) {
            const { error: deleteUserError } = await supabaseAdmin
              .from('admin_auth_users')
              .delete()
              .eq('id', user.id);

            if (deleteUserError !== null) {
              console.error('[Delete] Error deleting user:', deleteUserError);
            } else {
              console.log('[Delete] Deleted related user:', requestData.applicant_email);
              deletedUser = true;
            }
          }
        } else {
          console.log('[Delete] User has approved requests, skipping user deletion');
        }
      } catch (error) {
        console.error('[Delete] Error in user deletion process:', error);
        // ユーザー削除失敗でも申請削除は成功扱い
      }
    }

    // アクセスログに記録
    await supabaseAdmin
      .from('admin_access_logs')
      .insert({
        action: 'request_deleted',
        details: {
          request_id: id,
          store_name: requestData.store_name,
          admin_user: session.loginId,
          deleted_user: deletedUser,
          applicant_email: requestData.applicant_email
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
