-- リモートSupabaseの管理者ユーザー確認SQL

-- 1. admin_auth_usersテーブルの存在確認
SELECT EXISTS (
   SELECT FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'admin_auth_users'
) as table_exists;

-- 2. admin_auth_usersテーブルの全カラム確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'admin_auth_users'
ORDER BY ordinal_position;

-- 3. 全管理者ユーザーの一覧
SELECT
    id,
    login_id,
    display_name,
    role,
    is_active,
    created_at,
    last_login_at
FROM admin_auth_users
ORDER BY created_at;

-- 4. ys-yoshidaユーザーの詳細確認
SELECT
    id,
    login_id,
    display_name,
    role,
    is_active,
    failed_attempts,
    locked_until,
    created_at,
    last_login_at
FROM admin_auth_users
WHERE login_id = 'ys-yoshida';

-- 5. パスワードハッシュが設定されているか確認（ハッシュの長さのみ表示）
SELECT
    login_id,
    LENGTH(password_hash) as password_hash_length,
    password_hash IS NOT NULL as has_password
FROM admin_auth_users
WHERE login_id = 'ys-yoshida';
