-- ================================================
-- 管理者認証テーブルのみを追加するスクリプト
-- 既存のデータは削除しません
--
-- 実行方法：
-- 1. Supabase Studio (http://localhost:54323) にアクセス
-- 2. SQL Editor を開く
-- 3. このファイルの内容をコピー＆ペースト
-- 4. Run をクリック
-- ================================================

-- アクセスログテーブル（認証関数で使用）
CREATE TABLE IF NOT EXISTS admin_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action text NOT NULL,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

-- 新しい管理者認証テーブル（既存のテーブルには影響しない）
CREATE TABLE IF NOT EXISTS admin_auth_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    login_id text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    email text,
    role text CHECK (role IN ('super_admin', 'admin', 'moderator')) DEFAULT 'moderator',
    permissions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_admin_auth_users_login_id ON admin_auth_users(login_id);
CREATE INDEX IF NOT EXISTS idx_admin_auth_users_is_active ON admin_auth_users(is_active);

-- 初期管理者ユーザーの作成
-- 注: パスワードは簡易的にMD5ハッシュを使用（本番環境ではbcrypt等を推奨）
INSERT INTO admin_auth_users (login_id, password_hash, display_name, email, role, permissions, is_active) VALUES
('ga-ren', md5('Pass1234@!'), 'GA-REN', 'ga-ren@tukuyomi-admin.local', 'super_admin', '{"all": true}'::jsonb, true),
('ys-yoshida', md5('Pass1234@!'), 'YS-YOSHIDA', 'ys-yoshida@tukuyomi-admin.local', 'super_admin', '{"all": true}'::jsonb, true)
ON CONFLICT (login_id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    is_active = EXCLUDED.is_active;

-- 管理者認証関数
CREATE OR REPLACE FUNCTION authenticate_admin(
    p_login_id text,
    p_password text,
    p_ip_address text DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_user record;
    v_result json;
BEGIN
    -- ユーザーを取得
    SELECT * INTO v_user
    FROM admin_auth_users
    WHERE login_id = p_login_id
      AND is_active = true
    FOR UPDATE;

    -- ユーザーが見つからない場合
    IF NOT FOUND THEN
        -- ログ記録
        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('admin_login_failed', json_build_object('reason', 'invalid_login_id', 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object(
            'success', false,
            'message', 'ログインIDまたはパスワードが正しくありません'
        );
    END IF;

    -- ロック状態をチェック
    IF v_user.locked_until IS NOT NULL AND v_user.locked_until > now() THEN
        -- ログ記録
        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('admin_login_blocked', json_build_object('locked_until', v_user.locked_until, 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object(
            'success', false,
            'message', 'アカウントが一時的にロックされています',
            'locked_until', v_user.locked_until
        );
    END IF;

    -- パスワードをチェック（簡易版：MD5ハッシュ）
    IF v_user.password_hash != md5(p_password) THEN
        -- 失敗回数を増やす
        UPDATE admin_auth_users
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE
                WHEN failed_attempts >= 4 THEN now() + interval '30 minutes'
                ELSE NULL
            END
        WHERE id = v_user.id;

        -- ログ記録
        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('admin_login_failed', json_build_object('reason', 'invalid_password', 'attempts', v_user.failed_attempts + 1, 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object(
            'success', false,
            'message', 'ログインIDまたはパスワードが正しくありません',
            'attempts_remaining', 5 - (v_user.failed_attempts + 1)
        );
    END IF;

    -- 成功 - カウンタをリセットして最終ログイン時刻を更新
    UPDATE admin_auth_users
    SET failed_attempts = 0,
        locked_until = NULL,
        last_login_at = now()
    WHERE id = v_user.id;

    -- ログ記録
    INSERT INTO admin_access_logs (action, details, ip_address)
    VALUES ('admin_login_success', json_build_object('login_id', p_login_id, 'role', v_user.role), p_ip_address);

    RETURN json_build_object(
        'success', true,
        'user_id', v_user.id,
        'login_id', v_user.login_id,
        'display_name', v_user.display_name,
        'email', v_user.email,
        'role', v_user.role,
        'permissions', v_user.permissions
    );
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) の設定
ALTER TABLE admin_auth_users ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成（システム管理用のため、関数経由のアクセスのみ許可）
CREATE POLICY "No direct access to admin auth users" ON admin_auth_users
    FOR ALL
    USING (false);

-- 確認用のクエリ
SELECT '管理者ユーザーが作成されました:' as message;
SELECT login_id, display_name, role, email FROM admin_auth_users;