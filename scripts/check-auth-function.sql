-- 認証関数の存在確認
SELECT
    p.proname as function_name,
    pg_catalog.pg_get_function_arguments(p.oid) as arguments,
    pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'authenticate_admin'
  AND n.nspname = 'public';

-- admin_auth_usersテーブルの存在確認
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'admin_auth_users'
) as table_exists;

-- admin_auth_usersテーブルのデータ確認（データは削除しない、参照のみ）
SELECT login_id, display_name, role, is_active
FROM admin_auth_users
WHERE is_active = true;