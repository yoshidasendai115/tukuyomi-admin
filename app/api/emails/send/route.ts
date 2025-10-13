import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { storeApprovalEmail, passwordResetEmail, adminAccountCreatedEmail } from '@/lib/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export type EmailType = 'store_approval' | 'password_reset' | 'admin_account_created';

export type SendEmailRequest = {
  type: EmailType;
  to: string | string[];
  data: Record<string, unknown>;
};

/**
 * メール送信APIエンドポイント
 * POST /api/emails/send
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendEmailRequest = await request.json();
    const { type, to, data } = body;

    // バリデーション
    if (!type || !to || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, to, data' },
        { status: 400 }
      );
    }

    // Resend APIキーの確認
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email Send] RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      );
    }

    // メールテンプレートの選択
    let emailTemplate;

    switch (type) {
      case 'store_approval':
        emailTemplate = storeApprovalEmail(data as Parameters<typeof storeApprovalEmail>[0]);
        break;
      case 'password_reset':
        emailTemplate = passwordResetEmail(data as Parameters<typeof passwordResetEmail>[0]);
        break;
      case 'admin_account_created':
        emailTemplate = adminAccountCreatedEmail(data as Parameters<typeof adminAccountCreatedEmail>[0]);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 }
        );
    }

    console.log(`[Email Send] Sending ${type} email to:`, to);

    // メール送信
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'つくよみ運営チーム <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    if (error) {
      console.error('[Email Send] Resend API error:', error);
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    console.log('[Email Send] Email sent successfully:', emailData?.id);

    return NextResponse.json({
      success: true,
      messageId: emailData?.id,
    });
  } catch (error) {
    console.error('[Email Send] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
