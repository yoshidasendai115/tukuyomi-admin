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

    // 申請受付メールを送信
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3002';
      const emailResponse = await fetch(`${baseUrl}/api/emails/send-request-received`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: applicant_email,
          applicantName: applicant_name,
          storeName: store_name,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Failed to send request received email:', errorData);
      } else {
        console.log('Request received email sent successfully to:', applicant_email);
      }
    } catch (emailError) {
      console.error('Error sending request received email:', emailError);
      // メール送信失敗でも申請処理は成功とする
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