/**
 * メールテンプレート定義
 * 各種通知メールのHTMLテンプレートを管理
 */

export type EmailTemplate = {
  subject: string;
  html: string;
  text?: string;
};

/**
 * サポートチーム向け：新規申請通知メールテンプレート
 */
export const newRequestNotificationEmail = (params: {
  applicantName: string;
  applicantEmail: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  genreName: string | null;
  nearestStation: string | null;
  railwayLine: string | null;
  requestId: string;
  adminUrl: string;
  requestedAt: string;
}): EmailTemplate => {
  const {
    applicantName,
    applicantEmail,
    storeName,
    storeAddress,
    storePhone,
    genreName,
    nearestStation,
    railwayLine,
    requestId,
    adminUrl,
    requestedAt
  } = params;
  const appName = getAppName();

  return {
    subject: `【${appName}】新規店舗編集権限申請 - ${storeName}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>新規申請通知</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #e8f4fd; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">🔔 新規店舗編集権限申請</h1>
    <p style="font-size: 16px; margin-bottom: 0;">
      新しい店舗編集権限の申請がありました。
    </p>
  </div>

  <div style="background-color: #ffffff; border: 2px solid #3498db; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">店舗情報</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; width: 120px;">店舗名</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${storeName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">住所</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${storeAddress}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">電話番号</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${storePhone}</td>
      </tr>
      ${genreName ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">業態</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${genreName}</td>
      </tr>
      ` : ''}
      ${nearestStation || railwayLine ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">最寄り駅</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${railwayLine ? railwayLine + ' ' : ''}${nearestStation || ''}</td>
      </tr>
      ` : ''}
    </table>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #95a5a6; padding-bottom: 10px;">申請者情報</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; width: 120px;">氏名</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${applicantName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">メール</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;"><a href="mailto:${applicantEmail}">${applicantEmail}</a></td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">申請日時</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${requestedAt}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-weight: bold;">申請ID</td>
        <td style="padding: 10px 0; font-family: 'Courier New', monospace; font-size: 12px;">${requestId}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fff9e6; border: 1px solid #ffd966; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-weight: bold; color: #856404;">
      ⚠️ 対応が必要です
    </p>
    <p style="margin: 0 0 15px 0; font-size: 14px;">
      管理画面にログインして、申請内容と提出書類を確認してください。
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${adminUrl}" style="display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">管理画面で確認</a>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0;">
      ${appName} 自動通知システム
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】新規店舗編集権限申請

新しい店舗編集権限の申請がありました。

━━━━━━━━━━━━━━━━━━━━━━
店舗情報
━━━━━━━━━━━━━━━━━━━━━━
店舗名: ${storeName}
住所: ${storeAddress}
電話番号: ${storePhone}
${genreName ? `業態: ${genreName}\n` : ''}${nearestStation || railwayLine ? `最寄り駅: ${railwayLine ? railwayLine + ' ' : ''}${nearestStation || ''}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━
申請者情報
━━━━━━━━━━━━━━━━━━━━━━
氏名: ${applicantName}
メール: ${applicantEmail}
申請日時: ${requestedAt}
申請ID: ${requestId}

━━━━━━━━━━━━━━━━━━━━━━
⚠️ 対応が必要です

管理画面にログインして、申請内容と提出書類を確認してください。

管理画面URL: ${adminUrl}

━━━━━━━━━━━━━━━━━━━━━━
${appName} 自動通知システム
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};

/**
 * 環境変数から値を取得するヘルパー関数
 */
const getAppName = () => process.env.APP_NAME || 'がるなび';
const getFromName = () => process.env.EMAIL_FROM_NAME || 'がるなび運営チーム';
const getSupportEmail = () => process.env.EMAIL_SUPPORT || 'info@garunavi.jp';

/**
 * 店舗申請承認メールテンプレート
 */
export const storeApprovalEmail = (params: {
  storeName: string;
  storeAddress: string;
  loginId: string;
  temporaryPassword: string;
  loginUrl: string;
}): EmailTemplate => {
  const { storeName, storeAddress, loginId, temporaryPassword, loginUrl } = params;
  const appName = getAppName();
  const fromName = getFromName();
  const supportEmail = getSupportEmail();

  return {
    subject: `【${appName}】店舗申請が承認されました - ${storeName}`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>店舗申請承認のお知らせ</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">店舗申請承認のお知らせ</h1>
    <p style="font-size: 16px; margin-bottom: 20px;">
      この度は「${appName}」に店舗登録をご申請いただき、誠にありがとうございます。
    </p>
    <p style="font-size: 16px; margin-bottom: 20px;">
      申請内容を確認させていただき、下記の店舗情報で承認いたしましたのでご連絡いたします。
    </p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">店舗情報</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; width: 120px;">店舗名</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${storeName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">住所</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${storeAddress}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #fff9e6; border: 1px solid #ffd966; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #ffd966; padding-bottom: 10px;">管理画面ログイン情報</h2>
    <p style="margin-bottom: 15px;">
      店舗管理用のアカウントを発行いたしました。以下の情報でログインしてください。
    </p>
    <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 4px; overflow: hidden;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; font-weight: bold; background-color: #f8f9fa; width: 120px;">ログインID</td>
        <td style="padding: 12px; border-bottom: 1px solid #ecf0f1; font-family: 'Courier New', monospace; background-color: #ffffff;">${loginId}</td>
      </tr>
      <tr>
        <td style="padding: 12px; font-weight: bold; background-color: #f8f9fa;">仮パスワード</td>
        <td style="padding: 12px; font-family: 'Courier New', monospace; background-color: #ffffff;">${temporaryPassword}</td>
      </tr>
    </table>
    <div style="margin-top: 20px; padding: 15px; background-color: #ffe6e6; border-left: 4px solid #e74c3c; border-radius: 4px;">
      <p style="margin: 0; font-weight: bold; color: #c0392b;">⚠️ セキュリティに関する重要なお知らせ</p>
      <p style="margin: 10px 0 0 0; font-size: 14px;">
        初回ログイン後、必ずパスワードを変更してください。このメールは大切に保管してください。
      </p>
    </div>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${loginUrl}" style="display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">管理画面にログイン</a>
  </div>

  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-top: 30px; font-size: 14px; color: #7f8c8d;">
    <p style="margin: 0 0 10px 0;">
      <strong>今後の流れ</strong>
    </p>
    <ol style="margin: 0; padding-left: 20px;">
      <li>管理画面にログイン</li>
      <li>パスワードを変更</li>
      <li>店舗情報を確認・編集</li>
      <li>営業時間やメニュー情報を登録</li>
    </ol>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0 0 5px 0;">このメールに心当たりがない場合は、お手数ですが削除してください。</p>
    <p style="margin: 0;">
      <strong>${fromName}</strong><br>
      Email: ${supportEmail}
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】店舗申請が承認されました

この度は「${appName}」に店舗登録をご申請いただき、誠にありがとうございます。
申請内容を確認させていただき、下記の店舗情報で承認いたしましたのでご連絡いたします。

━━━━━━━━━━━━━━━━━━━━━━
店舗情報
━━━━━━━━━━━━━━━━━━━━━━
店舗名: ${storeName}
住所: ${storeAddress}

━━━━━━━━━━━━━━━━━━━━━━
管理画面ログイン情報
━━━━━━━━━━━━━━━━━━━━━━
ログインID: ${loginId}
仮パスワード: ${temporaryPassword}

⚠️ 初回ログイン後、必ずパスワードを変更してください。

管理画面URL: ${loginUrl}

━━━━━━━━━━━━━━━━━━━━━━
今後の流れ
━━━━━━━━━━━━━━━━━━━━━━
1. 管理画面にログイン
2. パスワードを変更
3. 店舗情報を確認・編集
4. 営業時間やメニュー情報を登録

このメールに心当たりがない場合は、お手数ですが削除してください。

━━━━━━━━━━━━━━━━━━━━━━
${fromName}
Email: ${supportEmail}
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};

/**
 * パスワードリセットメールテンプレート
 */
export const passwordResetEmail = (params: {
  adminName: string;
  resetUrl: string;
  expiryMinutes: number;
}): EmailTemplate => {
  const { adminName, resetUrl, expiryMinutes } = params;
  const appName = getAppName();
  const fromName = getFromName();
  const supportEmail = getSupportEmail();

  return {
    subject: `【${appName}】パスワードリセットのご案内`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>パスワードリセット</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">パスワードリセットのご案内</h1>
    <p style="font-size: 16px;">
      ${adminName} 様
    </p>
    <p style="font-size: 16px;">
      パスワードのリセット要求を受け付けました。
    </p>
  </div>

  <div style="background-color: #fff9e6; border: 1px solid #ffd966; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 15px 0; font-weight: bold;">
      以下のボタンをクリックして、新しいパスワードを設定してください。
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #e74c3c; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">パスワードをリセット</a>
    </div>
    <p style="margin: 15px 0 0 0; font-size: 14px; color: #7f8c8d;">
      このリンクは発行から${expiryMinutes}分間有効です。
    </p>
  </div>

  <div style="background-color: #ffe6e6; border-left: 4px solid #e74c3c; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #c0392b;">⚠️ 重要な注意事項</p>
    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
      <li>このリクエストに心当たりがない場合は、このメールを無視してください。</li>
      <li>パスワードリセットのリンクは他人と共有しないでください。</li>
      <li>リンクの有効期限が切れた場合は、再度リセット手続きを行ってください。</li>
    </ul>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0;">
      <strong>${fromName}</strong><br>
      Email: ${supportEmail}
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】パスワードリセットのご案内

${adminName} 様

パスワードのリセット要求を受け付けました。

以下のURLにアクセスして、新しいパスワードを設定してください。
このリンクは発行から${expiryMinutes}分間有効です。

${resetUrl}

⚠️ 重要な注意事項
・このリクエストに心当たりがない場合は、このメールを無視してください。
・パスワードリセットのリンクは他人と共有しないでください。
・リンクの有効期限が切れた場合は、再度リセット手続きを行ってください。

━━━━━━━━━━━━━━━━━━━━━━
${fromName}
Email: ${supportEmail}
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};

/**
 * アカウントロック通知メールテンプレート
 */
export const accountLockedEmail = (params: {
  adminName: string;
  unlockUrl: string;
  lockDurationMinutes: number;
}): EmailTemplate => {
  const { adminName, unlockUrl, lockDurationMinutes } = params;
  const appName = getAppName();
  const fromName = getFromName();
  const supportEmail = getSupportEmail();

  return {
    subject: `【${appName}】アカウントがロックされました`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>アカウントロック通知</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ffe6e6; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #e74c3c;">
    <h1 style="color: #c0392b; margin-top: 0; font-size: 24px;">⚠️ アカウントがロックされました</h1>
    <p style="font-size: 16px;">
      ${adminName} 様
    </p>
    <p style="font-size: 16px;">
      セキュリティ保護のため、アカウントが一時的にロックされました。
    </p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">ロックの理由</h2>
    <p style="margin-bottom: 15px; font-size: 16px;">
      ログインパスワードの入力を5回連続で失敗したため、不正アクセスを防ぐために自動的にアカウントをロックしました。
    </p>
    <div style="background-color: #fff9e6; border-left: 4px solid #ffd966; padding: 15px; border-radius: 4px; margin-bottom: 15px;">
      <p style="margin: 0; font-weight: bold; color: #856404;">自動ロック解除までの時間</p>
      <p style="margin: 10px 0 0 0; font-size: 20px; color: #856404;">
        <strong>${lockDurationMinutes}分後</strong>
      </p>
    </div>
  </div>

  <div style="background-color: #e8f4fd; border: 1px solid #3498db; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">すぐにロックを解除する</h2>
    <p style="margin-bottom: 15px;">
      ${lockDurationMinutes}分間待たずにすぐにアカウントのロックを解除することができます。
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${unlockUrl}" style="display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">今すぐロックを解除</a>
    </div>
    <p style="margin: 15px 0 0 0; font-size: 14px; color: #7f8c8d;">
      このリンクは発行から30分間有効です。
    </p>
  </div>

  <div style="background-color: #fff9e6; border-left: 4px solid #ffd966; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #856404;">💡 ヒント</p>
    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
      <li>パスワードを忘れた場合は、ログイン画面から「パスワードをお忘れですか？」をクリックしてリセットできます。</li>
      <li>このロック通知に心当たりがない場合は、第三者による不正アクセスの可能性があります。すぐにパスワードを変更することをお勧めします。</li>
    </ul>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0;">
      <strong>${fromName}</strong><br>
      Email: ${supportEmail}
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】アカウントがロックされました

${adminName} 様

セキュリティ保護のため、アカウントが一時的にロックされました。

━━━━━━━━━━━━━━━━━━━━━━
ロックの理由
━━━━━━━━━━━━━━━━━━━━━━
ログインパスワードの入力を5回連続で失敗したため、不正アクセスを防ぐために自動的にアカウントをロックしました。

自動ロック解除までの時間: ${lockDurationMinutes}分後

━━━━━━━━━━━━━━━━━━━━━━
すぐにロックを解除する
━━━━━━━━━━━━━━━━━━━━━━
${lockDurationMinutes}分間待たずにすぐにアカウントのロックを解除することができます。

以下のURLにアクセスしてください：
${unlockUrl}

このリンクは発行から30分間有効です。

━━━━━━━━━━━━━━━━━━━━━━
💡 ヒント
━━━━━━━━━━━━━━━━━━━━━━
・パスワードを忘れた場合は、ログイン画面から「パスワードをお忘れですか？」をクリックしてリセットできます。
・このロック通知に心当たりがない場合は、第三者による不正アクセスの可能性があります。すぐにパスワードを変更することをお勧めします。

━━━━━━━━━━━━━━━━━━━━━━
${fromName}
Email: ${supportEmail}
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};

/**
 * アカウントロック解除完了メールテンプレート
 */
export const accountUnlockedEmail = (params: {
  adminName: string;
  loginUrl: string;
}): EmailTemplate => {
  const { adminName, loginUrl } = params;
  const appName = getAppName();
  const fromName = getFromName();
  const supportEmail = getSupportEmail();

  return {
    subject: `【${appName}】アカウントのロックが解除されました`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>アカウントロック解除完了</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #e8f8f5; border-radius: 8px; padding: 30px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
    <h1 style="color: #27ae60; margin-top: 0; font-size: 24px;">✓ アカウントのロックが解除されました</h1>
    <p style="font-size: 16px;">
      ${adminName} 様
    </p>
    <p style="font-size: 16px;">
      アカウントのロックが正常に解除されました。再度ログインできるようになりました。
    </p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">ログイン情報</h2>
    <p style="margin-bottom: 15px;">
      以下のリンクから管理画面にアクセスできます。
    </p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #27ae60; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">ログイン画面へ</a>
    </div>
  </div>

  <div style="background-color: #fff9e6; border-left: 4px solid #ffd966; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #856404;">🔒 セキュリティに関するお知らせ</p>
    <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
      <li>このロック解除に心当たりがない場合は、すぐにパスワードを変更してください。</li>
      <li>不正アクセスの疑いがある場合は、運営チームまでお問い合わせください。</li>
      <li>定期的にパスワードを変更することをお勧めします。</li>
    </ul>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0;">
      <strong>${fromName}</strong><br>
      Email: ${supportEmail}
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】アカウントのロックが解除されました

${adminName} 様

アカウントのロックが正常に解除されました。再度ログインできるようになりました。

━━━━━━━━━━━━━━━━━━━━━━
ログイン情報
━━━━━━━━━━━━━━━━━━━━━━
以下のURLから管理画面にアクセスできます：
${loginUrl}

━━━━━━━━━━━━━━━━━━━━━━
🔒 セキュリティに関するお知らせ
━━━━━━━━━━━━━━━━━━━━━━
・このロック解除に心当たりがない場合は、すぐにパスワードを変更してください。
・不正アクセスの疑いがある場合は、運営チームまでお問い合わせください。
・定期的にパスワードを変更することをお勧めします。

━━━━━━━━━━━━━━━━━━━━━━
${fromName}
Email: ${supportEmail}
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};

/**
 * 管理者アカウント作成メールテンプレート
 */
export const adminAccountCreatedEmail = (params: {
  adminName: string;
  loginId: string;
  temporaryPassword: string;
  role: string;
  loginUrl: string;
}): EmailTemplate => {
  const { adminName, loginId, temporaryPassword, role, loginUrl } = params;
  const appName = getAppName();
  const fromName = getFromName();
  const supportEmail = getSupportEmail();

  const roleNames: Record<string, string> = {
    super_admin: 'スーパー管理者',
    admin: '管理者',
    store_owner: '店舗オーナー',
  };

  const roleName = roleNames[role] || role;

  return {
    subject: `【${appName}】管理者アカウントが作成されました`,
    html: `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理者アカウント作成</title>
</head>
<body style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h1 style="color: #2c3e50; margin-top: 0; font-size: 24px;">管理者アカウント作成のお知らせ</h1>
    <p style="font-size: 16px;">
      ${adminName} 様
    </p>
    <p style="font-size: 16px;">
      ${appName}管理システムのアカウントが作成されました。
    </p>
  </div>

  <div style="background-color: #ffffff; border: 1px solid #e1e8ed; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; font-size: 18px; margin-top: 0; border-bottom: 2px solid #3498db; padding-bottom: 10px;">アカウント情報</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold; width: 120px;">氏名</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${adminName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">権限</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1;">${roleName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-weight: bold;">ログインID</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #ecf0f1; font-family: 'Courier New', monospace;">${loginId}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; font-weight: bold;">仮パスワード</td>
        <td style="padding: 10px 0; font-family: 'Courier New', monospace;">${temporaryPassword}</td>
      </tr>
    </table>
  </div>

  <div style="background-color: #ffe6e6; border-left: 4px solid #e74c3c; border-radius: 4px; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #c0392b;">⚠️ セキュリティに関する重要なお知らせ</p>
    <p style="margin: 10px 0 0 0; font-size: 14px;">
      初回ログイン後、必ずパスワードを変更してください。このメールは大切に保管してください。
    </p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${loginUrl}" style="display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">管理画面にログイン</a>
  </div>

  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e8ed; font-size: 14px; color: #7f8c8d; text-align: center;">
    <p style="margin: 0 0 5px 0;">このメールに心当たりがない場合は、お手数ですが削除してください。</p>
    <p style="margin: 0;">
      <strong>${fromName}</strong><br>
      Email: ${supportEmail}
    </p>
  </div>
</body>
</html>
    `,
    text: `
【${appName}】管理者アカウント作成のお知らせ

${adminName} 様

${appName}管理システムのアカウントが作成されました。

━━━━━━━━━━━━━━━━━━━━━━
アカウント情報
━━━━━━━━━━━━━━━━━━━━━━
氏名: ${adminName}
権限: ${roleName}
ログインID: ${loginId}
仮パスワード: ${temporaryPassword}

⚠️ 初回ログイン後、必ずパスワードを変更してください。

管理画面URL: ${loginUrl}

━━━━━━━━━━━━━━━━━━━━━━
このメールに心当たりがない場合は、お手数ですが削除してください。

${fromName}
Email: ${supportEmail}
━━━━━━━━━━━━━━━━━━━━━━
    `,
  };
};
