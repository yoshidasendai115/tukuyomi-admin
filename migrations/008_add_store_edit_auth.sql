-- ================================================
-- 店舗編集トークン認証機能
-- トークンアクセス時のメールアドレス・パスワード認証
-- ================================================

-- 1. 認証情報テーブル
CREATE TABLE IF NOT EXISTS admin_store_edit_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    email text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true,
    require_auth boolean DEFAULT false, -- 認証を必須にするかどうか
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(token_id)
);

-- 2. 認証セッションテーブル
CREATE TABLE IF NOT EXISTS admin_store_edit_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    credential_id uuid REFERENCES admin_store_edit_credentials(id) ON DELETE CASCADE,
    session_token text UNIQUE NOT NULL,
    ip_address text,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. 認証ログテーブル
CREATE TABLE IF NOT EXISTS admin_store_edit_auth_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    credential_id uuid REFERENCES admin_store_edit_credentials(id) ON DELETE CASCADE,
    action text CHECK (action IN ('login_attempt', 'login_success', 'login_failed', 'logout', 'locked', 'password_changed')),
    email text,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_credentials_token_id ON admin_store_edit_credentials(token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_credentials_email ON admin_store_edit_credentials(email);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_token ON admin_store_edit_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_expires_at ON admin_store_edit_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_auth_logs_token_id ON admin_store_edit_auth_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_auth_logs_created_at ON admin_store_edit_auth_logs(created_at DESC);

-- 認証チェック関数
CREATE OR REPLACE FUNCTION check_store_edit_auth(
    p_token text,
    p_session_token text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_result json;
    v_token_data record;
    v_credential record;
    v_session record;
BEGIN
    -- トークン情報を取得
    SELECT t.*, c.*
    INTO v_token_data
    FROM admin_store_edit_tokens t
    LEFT JOIN admin_store_edit_credentials c ON c.token_id = t.id
    WHERE t.token = p_token
    AND t.is_active = true;

    -- トークンが存在しない
    IF v_token_data IS NULL THEN
        RETURN json_build_object(
            'authenticated', false,
            'error', 'invalid_token'
        );
    END IF;

    -- 認証が不要な場合
    IF v_token_data.require_auth IS NULL OR v_token_data.require_auth = false THEN
        RETURN json_build_object(
            'authenticated', true,
            'require_auth', false
        );
    END IF;

    -- セッショントークンが提供されていない
    IF p_session_token IS NULL THEN
        RETURN json_build_object(
            'authenticated', false,
            'require_auth', true,
            'error', 'auth_required'
        );
    END IF;

    -- セッション検証
    SELECT *
    INTO v_session
    FROM admin_store_edit_sessions
    WHERE session_token = p_session_token
    AND token_id = v_token_data.token_id
    AND is_active = true
    AND expires_at > now();

    IF v_session IS NULL THEN
        RETURN json_build_object(
            'authenticated', false,
            'require_auth', true,
            'error', 'invalid_session'
        );
    END IF;

    -- 認証成功
    RETURN json_build_object(
        'authenticated', true,
        'require_auth', true,
        'session_id', v_session.id,
        'expires_at', v_session.expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- アカウントロック解除関数
CREATE OR REPLACE FUNCTION unlock_store_edit_account(p_credential_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE admin_store_edit_credentials
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE id = p_credential_id;
END;
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE admin_store_edit_credentials IS '店舗編集トークンの認証情報';
COMMENT ON COLUMN admin_store_edit_credentials.require_auth IS '認証を必須にするかどうか';
COMMENT ON TABLE admin_store_edit_sessions IS '店舗編集の認証セッション';
COMMENT ON TABLE admin_store_edit_auth_logs IS '店舗編集の認証ログ';