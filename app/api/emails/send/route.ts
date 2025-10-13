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
    console.log('[Email Send] Starting email send process');
    console.log('[Email Send] Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasEmailFrom: !!process.env.EMAIL_FROM,
      emailFrom: process.env.EMAIL_FROM
    });

    const body: SendEmailRequest = await request.json();
    const { type, to, data } = body;

    console.log('[Email Send] Request received:', { type, to });

    // バリデーション
    if (!type || !to || !data) {
      console.error('[Email Send] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: type, to, data' },
        { status: 400 }
      );
    }

    // Resend APIキーの確認
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email Send] RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured (RESEND_API_KEY)' },
        { status: 500 }
      );
    }

    // EMAIL_FROMの確認
    if (!process.env.EMAIL_FROM) {
      console.error('[Email Send] EMAIL_FROM is not configured');
      const appName = process.env.APP_NAME || 'がるなび';
      return NextResponse.json(
        { error: `EMAIL_FROM is not configured. Please set it to "${appName} <onboarding@resend.dev>" or verify a domain.` },
        { status: 500 }
      );
    }

    console.log('[Email Send] All validations passed');

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
    console.log('[Email Send] Email parameters:', {
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject: emailTemplate.subject
    });

    // メール送信
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    if (error) {
      console.error('[Email Send] Resend API error:', JSON.stringify(error, null, 2));
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
    console.error('[Email Send] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
