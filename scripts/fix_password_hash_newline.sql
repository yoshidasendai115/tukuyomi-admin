-- パスワードハッシュの改行を削除するSQL
-- 問題: パスワードハッシュに改行が含まれていたため、bcrypt検証が失敗していた

-- ys-yoshida のパスワードハッシュを修正
UPDATE admin_auth_users
SET
    password_hash = '$2b$10$SMXkW/m311qhPWJ8QiMj/Owaf2l8GfRXV3Jss5uV9E2ICG4dqj9TG',
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE login_id = 'ys-yoshida';

-- ga-ren のパスワードハッシュを修正（同じパスワードの場合）
UPDATE admin_auth_users
SET
    password_hash = '$2b$10$SMXkW/m311qhPWJ8QiMj/Owaf2l8GfRXV3Jss5uV9E2ICG4dqj9TG',
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
WHERE login_id = 'ga-ren';

-- 確認用：更新後のハッシュ長を確認
SELECT
    login_id,
    LENGTH(password_hash) as hash_length,
    CASE
        WHEN password_hash LIKE '%
%' THEN 'Has newline'
        ELSE 'OK'
    END as newline_check
FROM admin_auth_users
WHERE login_id IN ('ys-yoshida', 'ga-ren');
