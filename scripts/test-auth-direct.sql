-- ユーザーの存在確認
SELECT
    login_id,
    display_name,
    is_active,
    failed_attempts,
    locked_until,
    password_hash,
    md5('Pass1234@!') as expected_hash,
    password_hash = md5('Pass1234@!') as password_match
FROM admin_auth_users
WHERE login_id = 'ys-yoshida';

-- 認証関数を直接テスト（成功するはず）
SELECT authenticate_admin('ys-yoshida', 'Pass1234@!', '::1');

-- ログを確認
SELECT
    action,
    details,
    ip_address,
    created_at
FROM admin_access_logs
ORDER BY created_at DESC
LIMIT 10;