import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getSession } from '@/lib/auth';
import { Resend } from 'resend';
import { requestReceivedEmail } from '@/lib/request-received-email-template';
import { newRequestNotificationEmail } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

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
      applicant_relationship,
      nearest_station,
      railway_line,
      station_distance
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
        nearest_station: nearest_station || null,
        railway_line: railway_line || null,
        station_distance: station_distance || null,
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

    // 申請受付メールを申請者に送信
    try {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
        console.error('[Request Received Email] Email service not configured');
      } else {
        const emailTemplate = requestReceivedEmail({
          applicantName: applicant_name,
          storeName: store_name,
        });

        const { error: emailError } = await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: [applicant_email],
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });

        if (emailError) {
          console.error('[Request Received Email] Failed to send:', emailError);
        } else {
          console.log('[Request Received Email] Email sent successfully to:', applicant_email);
        }
      }
    } catch (emailError) {
      console.error('[Request Received Email] Error:', emailError);
      // メール送信失敗でも申請処理は成功とする
    }

    // サポートチームへ新規申請通知メールを送信
    try {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM || !process.env.EMAIL_REQUEST_NOTIFICATION) {
        console.error('[Admin Notification Email] Email service not configured or EMAIL_REQUEST_NOTIFICATION not set');
      } else {
        // ジャンル名を取得
        let genreName: string | null = null;
        if (genre_id && supabaseAdmin) {
          const { data: genreData } = await supabaseAdmin
            .from('genres')
            .select('name')
            .eq('id', genre_id)
            .single();
          if (genreData) {
            genreName = genreData.name;
          }
        }

        const adminUrl = process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/requests`
          : 'https://admin.garunavi.jp/admin/requests';

        // 申請日時を日本時間でフォーマット
        const requestedAt = new Date(data.created_at).toLocaleString('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

        const notificationTemplate = newRequestNotificationEmail({
          applicantName: applicant_name,
          applicantEmail: applicant_email,
          storeName: store_name,
          storeAddress: store_address,
          storePhone: store_phone,
          genreName,
          nearestStation: nearest_station || null,
          railwayLine: railway_line || null,
          requestId: data.id,
          adminUrl,
          requestedAt,
        });

        const { error: notificationError } = await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: [process.env.EMAIL_REQUEST_NOTIFICATION],
          subject: notificationTemplate.subject,
          html: notificationTemplate.html,
          text: notificationTemplate.text,
        });

        if (notificationError) {
          console.error('[Admin Notification Email] Failed to send:', notificationError);
        } else {
          console.log('[Admin Notification Email] Email sent successfully to:', process.env.EMAIL_REQUEST_NOTIFICATION);
        }
      }
    } catch (notificationError) {
      console.error('[Admin Notification Email] Error:', notificationError);
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