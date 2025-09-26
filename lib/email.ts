import { supabase } from './supabase';

interface EmailTemplate {
  to: string;
  subject: string;
  body: string;
  type: 'receipt' | 'approval' | 'rejection';
}

interface ApprovalEmailData {
  storeName: string;
  applicantName: string;
  loginUrl: string;
  loginId: string;
  password: string;
}

interface RejectionEmailData {
  storeName: string;
  applicantName: string;
  rejectionReason: string;
}

interface ReceiptEmailData {
  storeName: string;
  applicantName: string;
  requestId: string;
}

/**
 * 受付完了メールのテンプレート
 */
export function generateReceiptEmail(
  email: string,
  data: ReceiptEmailData
): EmailTemplate {
  const subject = '【Tukuyomi】店舗編集URL申請を受け付けました';
  const body = `
${data.applicantName} 様

この度は、Tukuyomiシステムへの店舗編集URL申請をいただき、
誠にありがとうございます。

以下の内容で申請を受け付けました。

【申請内容】
店舗名: ${data.storeName}
申請番号: ${data.requestId}

管理者による審査後、結果をメールでお送りいたします。
審査には通常1〜3営業日程度かかります。

お急ぎの場合は、下記までお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tukuyomi 運営事務局
Email: support@tukuyomi.example.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  return {
    to: email,
    subject,
    body,
    type: 'receipt'
  };
}

/**
 * 承認メールのテンプレート
 */
export function generateApprovalEmail(
  email: string,
  data: ApprovalEmailData
): EmailTemplate {
  const subject = '【Tukuyomi】店舗編集URL申請が承認されました';
  const body = `
${data.applicantName} 様

店舗編集URL申請が承認されましたのでお知らせいたします。

【店舗情報】
店舗名: ${data.storeName}

【ログイン情報】
編集URL: ${data.loginUrl}
ログインID: ${data.loginId}
初期パスワード: ${data.password}

※セキュリティのため、初回ログイン後は必ずパスワードを変更してください。
※URLの有効期限は30日間です。
※ログインIDとパスワードは大切に保管してください。

【ご利用方法】
1. 上記の編集URLをクリックしてアクセス
2. ログインIDとパスワードを入力
3. 店舗情報を編集して保存

ご不明な点がございましたら、下記までお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tukuyomi 運営事務局
Email: support@tukuyomi.example.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  return {
    to: email,
    subject,
    body,
    type: 'approval'
  };
}

/**
 * 却下メールのテンプレート
 */
export function generateRejectionEmail(
  email: string,
  data: RejectionEmailData
): EmailTemplate {
  const subject = '【Tukuyomi】店舗編集URL申請について';
  const body = `
${data.applicantName} 様

店舗編集URL申請について審査させていただきました結果、
誠に恐れ入りますが、今回は承認を見送らせていただくことになりました。

【店舗情報】
店舗名: ${data.storeName}

【理由】
${data.rejectionReason}

再度申請をご希望の場合は、上記の点をご確認の上、
改めて申請フォームよりお申し込みください。

ご不明な点がございましたら、下記までお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tukuyomi 運営事務局
Email: support@tukuyomi.example.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  return {
    to: email,
    subject,
    body,
    type: 'rejection'
  };
}

/**
 * メール送信（実際の送信処理は外部サービスを使用）
 * 注: 実装では SendGrid, AWS SES, Resend などのサービスを使用
 */
export async function sendEmail(template: EmailTemplate): Promise<boolean> {
  try {
    // メール送信ログを記録
    await supabase
      .from('admin_email_logs')
      .insert({
        recipient_email: template.to,
        email_type: template.type,
        subject: template.subject,
        body: template.body,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    // TODO: 実際のメール送信処理を実装
    // 例: SendGrid
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: template.to,
    //   from: 'noreply@tukuyomi.example.com',
    //   subject: template.subject,
    //   text: template.body,
    // });

    console.log('Email would be sent to:', template.to);
    console.log('Subject:', template.subject);
    console.log('Body:', template.body);

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);

    // エラーログを記録
    await supabase
      .from('admin_email_logs')
      .insert({
        recipient_email: template.to,
        email_type: template.type,
        subject: template.subject,
        body: template.body,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });

    return false;
  }
}

/**
 * ランダムパスワード生成
 */
export function generatePassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';

  // 各種文字を最低1つ含める
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // 残りをランダムに生成
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // シャッフル
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * ログインID生成（店舗名ベース）
 */
export function generateLoginId(storeName: string): string {
  // 店舗名から英数字のみ抽出
  const base = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 8);

  // ランダムな数字を追加
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  return `${base}${random}`;
}