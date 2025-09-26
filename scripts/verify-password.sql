-- パスワードハッシュ値の詳細確認
SELECT
    login_id,
    password_hash,
    md5('Pass1234@!') as expected_hash,
    password_hash = md5('Pass1234@!') as matches,
    length(password_hash) as hash_length,
    length(md5('Pass1234@!')) as expected_length
FROM admin_auth_users
WHERE login_id = 'ys-yoshida';

-- 手動でパスワードを再設定
UPDATE admin_auth_users
SET password_hash = md5('Pass1234@!')
WHERE login_id IN ('ys-yoshida', 'ga-ren');

-- 更新後の確認
SELECT
    login_id,
    password_hash = md5('Pass1234@!') as password_correct
FROM admin_auth_users
WHERE login_id IN ('ys-yoshida', 'ga-ren');