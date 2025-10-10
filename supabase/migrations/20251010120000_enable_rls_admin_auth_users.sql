-- admin_auth_usersテーブルのRLS設定
-- このテーブルはservice_roleのみがアクセスする

-- RLSを有効化
ALTER TABLE admin_auth_users ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーをクリーンアップ
DROP POLICY IF EXISTS "admin_auth_users_select_policy" ON admin_auth_users;
DROP POLICY IF EXISTS "admin_auth_users_insert_policy" ON admin_auth_users;
DROP POLICY IF EXISTS "admin_auth_users_update_policy" ON admin_auth_users;
DROP POLICY IF EXISTS "admin_auth_users_delete_policy" ON admin_auth_users;
DROP POLICY IF EXISTS "service_role_only_select" ON admin_auth_users;
DROP POLICY IF EXISTS "service_role_only_insert" ON admin_auth_users;
DROP POLICY IF EXISTS "service_role_only_update" ON admin_auth_users;
DROP POLICY IF EXISTS "service_role_only_delete" ON admin_auth_users;

-- service_roleのみアクセス可能なポリシー
-- 注意: service_roleは自動的にRLSをバイパスするため、以下のポリシーは
-- anon/authenticatedロールからのアクセスを防ぐためのもの

CREATE POLICY "service_role_only_select"
ON admin_auth_users
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "service_role_only_insert"
ON admin_auth_users
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_only_update"
ON admin_auth_users
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_only_delete"
ON admin_auth_users
FOR DELETE
TO service_role
USING (true);

-- anonとauthenticatedロールの権限を剥奪（セキュリティ強化）
REVOKE ALL ON admin_auth_users FROM anon;
REVOKE ALL ON admin_auth_users FROM authenticated;

-- service_roleには全権限を付与（既に設定済みだが念のため）
GRANT ALL ON admin_auth_users TO service_role;
GRANT ALL ON admin_auth_users TO postgres;

-- コメント
COMMENT ON TABLE admin_auth_users IS '管理者認証テーブル - service_roleのみアクセス可能';
