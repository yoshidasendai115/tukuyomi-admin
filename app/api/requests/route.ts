import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // セッション確認
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 申請一覧を取得（関連する店舗情報とジャンル情報を含む）
    const { data: requests, error } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .select(`
        *,
        related_store:store_id(*),
        genre:genre_id(id, name, is_visible, display_order)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: requests || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { message: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST: 新規申請作成（tukuyomi-webからの申請受付）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      store_name,
      store_address,
      store_phone,
      genre_id,
      applicant_name,
      applicant_email,
      applicant_phone,
      applicant_role,
      business_license,
      additional_info,
      document_type,
      business_license_image,
      additional_document_type,
      additional_document_image,
      identity_document_image,
      license_holder_name,
      applicant_relationship
    } = body;

    // 必須項目チェック
    if (!store_name || !store_address || !store_phone || !applicant_name || !applicant_email || !applicant_phone) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // 画像必須チェック
    if (!business_license_image) {
      return NextResponse.json(
        { error: '飲食店営業許可証の画像をアップロードしてください' },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { message: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    // 申請データを挿入
    const { data, error } = await supabaseAdmin
      .from('admin_store_edit_requests')
      .insert({
        store_name,
        store_address,
        store_phone,
        genre_id,
        applicant_name,
        applicant_email,
        applicant_phone,
        applicant_role: applicant_role || '店舗関係者',
        business_license,
        additional_info,
        document_type: document_type || 'restaurant_license',
        business_license_image,
        additional_document_type,
        additional_document_image,
        identity_document_image,
        license_holder_name: license_holder_name || applicant_name,
        applicant_relationship: applicant_relationship || 'owner',
        status: 'pending',
        document_verification_status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating request:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '申請が正常に送信されました。管理者による確認をお待ちください。',
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