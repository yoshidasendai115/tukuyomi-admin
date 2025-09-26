-- パスワードハッシュ値の確認
SELECT
    login_id,
    password_hash as stored_hash,
    md5('Pass1234@!') as expected_hash,
    password_hash = md5('Pass1234@!') as password_match
FROM admin_auth_users
WHERE login_id IN ('ga-ren', 'ys-yoshida');

-- 認証関数のテスト
SELECT authenticate_admin('ys-yoshida', 'Pass1234@!', 'test-ip');