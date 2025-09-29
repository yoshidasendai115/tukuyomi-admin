-- admin_auth_usersテーブルを作成（admin_usersテーブルは削除）
DROP TABLE IF EXISTS admin_users CASCADE;

-- admin_auth_usersテーブルを作成
CREATE TABLE IF NOT EXISTS admin_auth_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    display_name text,
    email text,
    role text DEFAULT 'admin',
    permissions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_admin_auth_users_login_id ON admin_auth_users(login_id);
CREATE INDEX IF NOT EXISTS idx_admin_auth_users_email ON admin_auth_users(email);

-- RLSを有効化
ALTER TABLE admin_auth_users ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（service_roleのみ）
CREATE POLICY "Service role can manage admin_auth_users" ON admin_auth_users
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');