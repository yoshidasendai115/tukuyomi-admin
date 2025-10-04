-- パスワードハッシュを新規生成したハッシュで置き換える
-- パスワード: Pass1234@!
-- 改行の問題を根本的に解決するため、新しいハッシュを使用

UPDATE admin_auth_users
SET
    password_hash = '$2b$10$SujSBdZhAIBirodJr/98T.Wr9HKqCDnn0Busu26mwWOI8vOBrOjLC',
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE login_id = 'ys-yoshida';

UPDATE admin_auth_users
SET
    password_hash = '$2b$10$SujSBdZhAIBirodJr/98T.Wr9HKqCDnn0Busu26mwWOI8vOBrOjLC',
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE login_id = 'ga-ren';

-- 確認：ハッシュ長が60文字であることを確認
SELECT
    login_id,
    LENGTH(password_hash) as hash_length,
    LEFT(password_hash, 10) as hash_prefix
FROM admin_auth_users
WHERE login_id IN ('ys-yoshida', 'ga-ren');
