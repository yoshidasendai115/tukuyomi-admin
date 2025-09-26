-- 既存データを削除せず、失敗回数とロックをリセット
UPDATE admin_auth_users
SET
    password_hash = md5('Pass1234@!'),
    failed_attempts = 0,
    locked_until = NULL,
    is_active = true
WHERE login_id IN ('ys-yoshida', 'ga-ren');

-- 確認
SELECT
    login_id,
    is_active,
    failed_attempts,
    locked_until,
    password_hash = md5('Pass1234@!') as password_ok
FROM admin_auth_users;

-- サービスロールキーで認証関数を直接テスト
SELECT authenticate_admin('ys-yoshida', 'Pass1234@!', '::1') as auth_test;