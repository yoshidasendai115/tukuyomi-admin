-- ================================================
-- Tukuyomi Admin System Tables
-- 注意: tukuyomi-webと同じデータベースを使用
-- 既存のstoresテーブル等は変更しない
-- ================================================

-- 1. 店舗編集申請テーブル（管理者用）
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
    reviewed_by uuid REFERENCES auth.users(id),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. アクセストークンテーブル（管理者用）
CREATE TABLE IF NOT EXISTS admin_store_edit_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES admin_store_edit_requests(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,  -- 既存のstoresテーブルを参照
    token text UNIQUE NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    max_uses integer DEFAULT 100,
    use_count integer DEFAULT 0,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. アクセスログテーブル（管理者用）
CREATE TABLE IF NOT EXISTS admin_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    store_id uuid,
    ip_address text,
    user_agent text,
    action text NOT NULL, -- login, view, edit, logout, failed_login, blocked
    details jsonb,
    session_id text,
    country text,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. レート制限テーブル（管理者用）
CREATE TABLE IF NOT EXISTS admin_rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier text NOT NULL,
    identifier_type text CHECK (identifier_type IN ('ip', 'email', 'token')),
    action_type text CHECK (action_type IN ('request_submit', 'login_attempt', 'edit_action')),
    attempt_count integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    blocked_until timestamp with time zone,
    UNIQUE(identifier, identifier_type, action_type)
);

-- 5. 管理者テーブル
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('super_admin', 'admin', 'moderator')) DEFAULT 'moderator',
    permissions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_status ON admin_store_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_created_at ON admin_store_edit_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_tokens_token ON admin_store_edit_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_tokens_expires_at ON admin_store_edit_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_token_id ON admin_access_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_created_at ON admin_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_identifier ON admin_rate_limits(identifier, identifier_type, action_type);

-- レート制限チェック関数
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_identifier text,
    p_identifier_type text,
    p_action_type text,
    p_max_attempts integer DEFAULT 5,
    p_window_minutes integer DEFAULT 60
) RETURNS json AS $$
DECLARE
    v_result json;
    v_rate_limit record;
    v_window_start timestamp with time zone;
BEGIN
    v_window_start := now() - (p_window_minutes || ' minutes')::interval;

    -- 既存のレート制限レコードを取得
    SELECT * INTO v_rate_limit
    FROM admin_rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND action_type = p_action_type
      AND (blocked_until IS NULL OR blocked_until > now())
    FOR UPDATE;

    -- レコードが存在しない場合は新規作成
    IF NOT FOUND THEN
        INSERT INTO admin_rate_limits (identifier, identifier_type, action_type, attempt_count, window_start)
        VALUES (p_identifier, p_identifier_type, p_action_type, 1, now());

        RETURN json_build_object(
            'allowed', true,
            'attempts', 1,
            'max_attempts', p_max_attempts
        );
    END IF;

    -- ブロック中の場合
    IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > now() THEN
        RETURN json_build_object(
            'allowed', false,
            'blocked_until', v_rate_limit.blocked_until,
            'message', 'Rate limit exceeded. Please try again later.'
        );
    END IF;

    -- ウィンドウ内の試行回数をチェック
    IF v_rate_limit.window_start < v_window_start THEN
        -- ウィンドウをリセット
        UPDATE admin_rate_limits
        SET attempt_count = 1,
            window_start = now(),
            blocked_until = NULL
        WHERE id = v_rate_limit.id;

        RETURN json_build_object(
            'allowed', true,
            'attempts', 1,
            'max_attempts', p_max_attempts
        );
    ELSE
        -- 試行回数を増やす
        IF v_rate_limit.attempt_count >= p_max_attempts THEN
            -- ブロック
            UPDATE admin_rate_limits
            SET attempt_count = v_rate_limit.attempt_count + 1,
                blocked_until = now() + interval '30 minutes'
            WHERE id = v_rate_limit.id;

            RETURN json_build_object(
                'allowed', false,
                'blocked_until', now() + interval '30 minutes',
                'message', 'Rate limit exceeded. Please try again in 30 minutes.'
            );
        ELSE
            UPDATE admin_rate_limits
            SET attempt_count = v_rate_limit.attempt_count + 1
            WHERE id = v_rate_limit.id;

            RETURN json_build_object(
                'allowed', true,
                'attempts', v_rate_limit.attempt_count + 1,
                'max_attempts', p_max_attempts
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- トークン検証関数
CREATE OR REPLACE FUNCTION validate_edit_token(
    p_token text,
    p_ip_address text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_token_record record;
    v_result json;
BEGIN
    -- トークンを検索
    SELECT * INTO v_token_record
    FROM admin_store_edit_tokens
    WHERE token = p_token
      AND is_active = true
    FOR UPDATE;

    -- トークンが見つからない場合
    IF NOT FOUND THEN
        -- ログ記録
        INSERT INTO admin_access_logs (ip_address, action, details)
        VALUES (p_ip_address, 'failed_login', json_build_object('reason', 'invalid_token', 'token', p_token));

        RETURN json_build_object(
            'success', false,
            'message', 'Invalid token'
        );
    END IF;

    -- 有効期限をチェック
    IF v_token_record.expires_at < now() THEN
        -- ログ記録
        INSERT INTO admin_access_logs (token_id, ip_address, action, details)
        VALUES (v_token_record.id, p_ip_address, 'failed_login', json_build_object('reason', 'expired_token'));

        RETURN json_build_object(
            'success', false,
            'message', 'Token has expired'
        );
    END IF;

    -- 削除: PINコード認証は不要のため、ロック機能も削除

    -- 使用回数制限をチェック
    IF v_token_record.use_count >= v_token_record.max_uses THEN
        -- ログ記録
        INSERT INTO admin_access_logs (token_id, ip_address, action, details)
        VALUES (v_token_record.id, p_ip_address, 'failed_login', json_build_object('reason', 'max_uses_exceeded'));

        RETURN json_build_object(
            'success', false,
            'message', 'Token usage limit exceeded'
        );
    END IF;

    -- 成功 - カウンタをリセットして使用回数を増やす
    UPDATE admin_store_edit_tokens
    SET failed_attempts = 0,
        locked_until = NULL,
        use_count = use_count + 1,
        last_used_at = now()
    WHERE id = v_token_record.id;

    -- ログ記録
    INSERT INTO admin_access_logs (token_id, store_id, ip_address, action, details)
    VALUES (v_token_record.id, v_token_record.store_id, p_ip_address, 'login', json_build_object('success', true));

    RETURN json_build_object(
        'success', true,
        'token_id', v_token_record.id,
        'store_id', v_token_record.store_id,
        'request_id', v_token_record.request_id,
        'expires_at', v_token_record.expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) の設定
ALTER TABLE admin_store_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_store_edit_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（管理者のみアクセス可能）
CREATE POLICY "Admin users can view all requests" ON admin_store_edit_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "Admin users can update requests" ON admin_store_edit_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- 申請は誰でも作成可能（レート制限は別途実装）
CREATE POLICY "Anyone can create requests" ON admin_store_edit_requests
    FOR INSERT
    WITH CHECK (true);

-- トークン関連のポリシー
CREATE POLICY "Admin users can manage tokens" ON admin_store_edit_tokens
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- アクセスログは管理者のみ閲覧可能
CREATE POLICY "Admin users can view access logs" ON admin_access_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.is_active = true
        )
    );

-- システムからのログ記録は許可
CREATE POLICY "System can insert access logs" ON admin_access_logs
    FOR INSERT
    WITH CHECK (true);

-- レート制限は誰でも作成・更新可能（関数経由）
CREATE POLICY "Anyone can use rate limits" ON admin_rate_limits
    FOR ALL
    WITH CHECK (true);

-- 管理者ユーザーは管理者のみ管理可能
CREATE POLICY "Super admins can manage admin users" ON admin_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.role = 'super_admin'
            AND admin_users.is_active = true
        )
    );