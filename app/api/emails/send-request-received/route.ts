import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requestReceivedEmail } from '@/lib/request-received-email-template';

const resend = new Resend(process.env.RESEND_API_KEY);

export type SendRequestReceivedEmailRequest = {
  to: string;
  applicantName: string;
  storeName: string;
};

/**
 * 申請受付メール送信APIエンドポイント
 * POST /api/emails/send-request-received
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Request Received Email] Starting email send process');
    console.log('[Request Received Email] Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasEmailFrom: !!process.env.EMAIL_FROM,
      emailFrom: process.env.EMAIL_FROM
    });

    const body: SendRequestReceivedEmailRequest = await request.json();
    const { to, applicantName, storeName } = body;

    console.log('[Request Received Email] Request received:', { to, applicantName, storeName });

    // バリデーション
    if (!to || !applicantName || !storeName) {
      console.error('[Request Received Email] Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: to, applicantName, storeName' },
        { status: 400 }
      );
    }

    // Resend APIキーの確認
    if (!process.env.RESEND_API_KEY) {
      console.error('[Request Received Email] RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured (RESEND_API_KEY)' },
        { status: 500 }
      );
    }

    // EMAIL_FROMの確認
    if (!process.env.EMAIL_FROM) {
      console.error('[Request Received Email] EMAIL_FROM is not configured');
      const appName = process.env.APP_NAME || 'がるなび';
      return NextResponse.json(
        { error: `EMAIL_FROM is not configured. Please set it to "${appName} <onboarding@resend.dev>" or verify a domain.` },
        { status: 500 }
      );
    }

    console.log('[Request Received Email] All validations passed');

    // メールテンプレートの生成
    const emailTemplate = requestReceivedEmail({
      applicantName,
      storeName,
    });

    console.log('[Request Received Email] Sending request received email to:', to);
    console.log('[Request Received Email] Email parameters:', {
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: emailTemplate.subject
    });

    // メール送信
    const { data: emailData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    if (error) {
      console.error('[Request Received Email] Resend API error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      );
    }

    console.log('[Request Received Email] Email sent successfully:', emailData?.id);

    return NextResponse.json({
      success: true,
      messageId: emailData?.id,
    });
  } catch (error) {
    console.error('[Request Received Email] Unexpected error:', error);
    console.error('[Request Received Email] Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
