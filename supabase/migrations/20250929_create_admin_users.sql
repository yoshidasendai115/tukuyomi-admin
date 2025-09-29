-- admin_usersテーブルを作成
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE NOT NULL,
    email text,
    password_hash text NOT NULL,
    is_super_admin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- RLSを有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 読み取り用RLSポリシー（service_roleのみ）
CREATE POLICY "Service role can read admin_users" ON admin_users
    FOR SELECT
    USING (auth.jwt()->>'role' = 'service_role');

-- 書き込み用RLSポリシー（service_roleのみ）
CREATE POLICY "Service role can write admin_users" ON admin_users
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');