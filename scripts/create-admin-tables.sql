-- ================================================
-- 管理システム用テーブル作成
-- 既存のデータは削除しません
-- ================================================

-- 店舗編集申請テーブル
CREATE TABLE IF NOT EXISTS admin_store_edit_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name text NOT NULL,
    store_address text NOT NULL,
    store_phone text NOT NULL,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text NOT NULL,
    applicant_role text NOT NULL,
    business_license text,
    additional_info text,
    status text CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')) DEFAULT 'pending',
    admin_notes text,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    processed_by uuid REFERENCES admin_auth_users(id) ON DELETE SET NULL
);

-- 編集トークンテーブル
CREATE TABLE IF NOT EXISTS admin_store_edit_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES admin_store_edit_requests(id) ON DELETE CASCADE,
    store_id uuid,
    token text UNIQUE NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    use_count integer DEFAULT 0,
    max_uses integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_requests_status ON admin_store_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON admin_store_edit_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON admin_store_edit_tokens(token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON admin_store_edit_tokens(expires_at);

-- 確認
SELECT 'テーブルが作成されました' as message;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'admin_%'
ORDER BY table_name;