/**
 * 申請受付メールテンプレート
 * 店舗編集権限申請フォーム送信時に送信される自動返信メール
 */

export type EmailTemplate = {
  subject: string;
  html: string;
  text?: string;
};

/**
 * 環境変数から値を取得するヘルパー関数
 */
const getAppName = () => process.env.APP_NAME || 'がるなび';
const getFromName = () => process.env.EMAIL_FROM_NAME || 'がるなび運営チーム';
const getSupportEmail = () => process.env.EMAIL_SUPPORT || 'support@garunavi.jp';

/**
 * 申請受付メールテンプレート
 */
export const requestReceivedEmail = (params: {
  applicantName: string;
  storeName: string;
}): EmailTemplate => {
  const { applicantName, storeName } = params;
  const appName = getAppName();
  const fromName = getFromName();
  const supportEmail = getSupportEmail();

  return {
    subject: `【${appName}】店舗編集権限申請を受け付けました - ${storeName}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>申請受付のお知らせ</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">店舗編集権限申請を受け付けました</h1>
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${applicantName} 様
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      この度は「${appName}」に店舗編集権限の申請をしていただき、誠にありがとうございます。
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      申請内容を受け付けましたので、ご連絡いたします。
    </p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">申請店舗</h2>
    <p style="font-size: 16px; margin: 10px 0;">
      ${storeName}
    </p>
  </div>

  <div style="background-color: #e8f4f8; border: 1px solid #b3d9e6; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">今後の流れ</h2>
    <p style="margin: 10px 0;">
      申請内容を審査させていただきます。審査には<strong>2〜3営業日</strong>程度お時間をいただく場合がございます。
    </p>
    <ol style="margin: 15px 0; padding-left: 20px;">
      <li style="margin-bottom: 10px;">申請内容および提出書類の確認</li>
      <li style="margin-bottom: 10px;">審査結果のメール通知</li>
      <li style="margin-bottom: 10px;">承認後、ログイン情報をメールでお送りします</li>
    </ol>
  </div>

  <div style="background-color: #fff9e6; border-left: 4px solid #ffd966; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #856404;">📌 ご確認ください</p>
    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
      <li>審査結果は、ご登録いただいたメールアドレス宛にお送りいたします。</li>
      <li>内容に不備がある場合は、別途ご連絡させていただく場合がございます。</li>
      <li>ご不明な点がございましたら、下記のサポート窓口までお問い合わせください。</li>
    </ul>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0 0 10px 0;">今しばらくお待ちくださいますよう、よろしくお願いいたします。</p>
    <p style="margin: 0;">
      <strong>${fromName}</strong><br>
      Email: ${supportEmail}
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】店舗編集権限申請を受け付けました

${applicantName} 様

この度は「${appName}」に店舗編集権限の申請をしていただき、誠にありがとうございます。
申請内容を受け付けましたので、ご連絡いたします。

━━━━━━━━━━━━━━━━━━━━━━
申請店舗
━━━━━━━━━━━━━━━━━━━━━━
${storeName}

━━━━━━━━━━━━━━━━━━━━━━
今後の流れ
━━━━━━━━━━━━━━━━━━━━━━
申請内容を審査させていただきます。審査には2〜3営業日程度お時間をいただく場合がございます。

1. 申請内容および提出書類の確認
2. 審査結果のメール通知
3. 承認後、ログイン情報をメールでお送りします

━━━━━━━━━━━━━━━━━━━━━━
📌 ご確認ください
━━━━━━━━━━━━━━━━━━━━━━
・審査結果は、ご登録いただいたメールアドレス宛にお送りいたします。
・内容に不備がある場合は、別途ご連絡させていただく場合がございます。
・ご不明な点がございましたら、下記のサポート窓口までお問い合わせください。

今しばらくお待ちくださいますよう、よろしくお願いいたします。

━━━━━━━━━━━━━━━━━━━━━━
${fromName}
Email: ${supportEmail}
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};
