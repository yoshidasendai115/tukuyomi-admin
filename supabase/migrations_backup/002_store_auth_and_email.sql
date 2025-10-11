-- ================================================
-- Store Authentication and Email System
-- 店舗認証とメール送信機能の追加
-- ================================================

-- 1. 店舗認証情報テーブル（管理者用）
CREATE TABLE IF NOT EXISTS admin_store_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    login_id text UNIQUE NOT NULL, -- ログインID（店舗ごとにユニーク）
    password_hash text NOT NULL, -- ハッシュ化されたパスワード
    is_active boolean DEFAULT true,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. メール送信履歴テーブル（管理者用）
CREATE TABLE IF NOT EXISTS admin_email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES admin_store_edit_requests(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    email_type text CHECK (email_type IN ('receipt', 'approval', 'rejection')) NOT NULL,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    status text CHECK (status IN ('sent', 'failed', 'pending')) DEFAULT 'pending',
    error_message text,
    metadata jsonb
);

-- 3. 店舗編集URLテーブルを更新（トークンからUUIDベースへ）
ALTER TABLE admin_store_edit_tokens
    DROP COLUMN IF EXISTS token,
    ADD COLUMN IF NOT EXISTS edit_url_uuid uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_admin_store_credentials_store_id ON admin_store_credentials(store_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_credentials_login_id ON admin_store_credentials(login_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_logs_request_id ON admin_email_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_logs_store_id ON admin_email_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_admin_email_logs_sent_at ON admin_email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_tokens_edit_url_uuid ON admin_store_edit_tokens(edit_url_uuid);

-- 店舗認証関数
CREATE OR REPLACE FUNCTION authenticate_store(
    p_login_id text,
    p_password text,
    p_ip_address text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_credentials record;
    v_result json;
BEGIN
    -- 認証情報を取得
    SELECT * INTO v_credentials
    FROM admin_store_credentials
    WHERE login_id = p_login_id
      AND is_active = true
    FOR UPDATE;

    -- アカウントが見つからない場合
    IF NOT FOUND THEN
        -- ログ記録
        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('store_login_failed', json_build_object('reason', 'invalid_login_id', 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object(
            'success', false,
            'message', 'ログインIDまたはパスワードが正しくありません'
        );
    END IF;

    -- ロック状態をチェック
    IF v_credentials.locked_until IS NOT NULL AND v_credentials.locked_until > now() THEN
        -- ログ記録
        INSERT INTO admin_access_logs (store_id, action, details, ip_address)
        VALUES (v_credentials.store_id, 'store_login_blocked', json_build_object('locked_until', v_credentials.locked_until), p_ip_address);

        RETURN json_build_object(
            'success', false,
            'message', 'アカウントが一時的にロックされています',
            'locked_until', v_credentials.locked_until
        );
    END IF;

    -- パスワードをチェック（簡易版：本番環境ではbcryptなどを使用）
    IF v_credentials.password_hash != crypt(p_password, v_credentials.password_hash) THEN
        -- 失敗回数を増やす
        UPDATE admin_store_credentials
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE
                WHEN failed_attempts >= 4 THEN now() + interval '30 minutes'
                ELSE NULL
            END
        WHERE id = v_credentials.id;

        -- ログ記録
        INSERT INTO admin_access_logs (store_id, action, details, ip_address)
        VALUES (v_credentials.store_id, 'store_login_failed', json_build_object('reason', 'invalid_password', 'attempts', v_credentials.failed_attempts + 1), p_ip_address);

        RETURN json_build_object(
            'success', false,
            'message', 'ログインIDまたはパスワードが正しくありません',
            'attempts_remaining', 5 - (v_credentials.failed_attempts + 1)
        );
    END IF;

    -- 成功 - カウンタをリセットして最終ログイン時刻を更新
    UPDATE admin_store_credentials
    SET failed_attempts = 0,
        locked_until = NULL,
        last_login_at = now()
    WHERE id = v_credentials.id;

    -- ログ記録
    INSERT INTO admin_access_logs (store_id, action, details, ip_address)
    VALUES (v_credentials.store_id, 'store_login_success', json_build_object('login_id', p_login_id), p_ip_address);

    RETURN json_build_object(
        'success', true,
        'store_id', v_credentials.store_id,
        'credentials_id', v_credentials.id
    );
END;
$$ LANGUAGE plpgsql;

-- メール送信記録関数
CREATE OR REPLACE FUNCTION record_email_sent(
    p_request_id uuid,
    p_store_id uuid,
    p_email_type text,
    p_recipient_email text,
    p_subject text,
    p_body text,
    p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid AS $$
DECLARE
    v_email_id uuid;
BEGIN
    INSERT INTO admin_email_logs (
        request_id,
        store_id,
        email_type,
        recipient_email,
        subject,
        body,
        status,
        metadata
    ) VALUES (
        p_request_id,
        p_store_id,
        p_email_type,
        p_recipient_email,
        p_subject,
        p_body,
        'sent',
        p_metadata
    ) RETURNING id INTO v_email_id;

    RETURN v_email_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) の設定
ALTER TABLE admin_store_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_email_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
CREATE POLICY "Admin users can manage store credentials" ON admin_store_credentials
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "Admin users can view email logs" ON admin_email_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
            AND admin_users.is_active = true
        )
    );

CREATE POLICY "System can insert email logs" ON admin_email_logs
    FOR INSERT
    WITH CHECK (true);