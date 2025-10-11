-- 管理者認証用RPC関数
CREATE OR REPLACE FUNCTION authenticate_admin(
  p_login_id TEXT,
  p_password TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_password_valid BOOLEAN;
  v_failed_attempts INTEGER;
  v_last_failed_at TIMESTAMPTZ;
  v_block_duration INTERVAL := '30 minutes';
  v_max_attempts INTEGER := 5;
  v_result JSON;
BEGIN
  -- ユーザー情報を取得
  SELECT * INTO v_user
  FROM admin_auth_users
  WHERE login_id = p_login_id;

  -- ユーザーが存在しない場合
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'ログインIDまたはパスワードが正しくありません'
    );
  END IF;

  -- アカウントが無効化されている場合
  IF v_user.is_active = false THEN
    RETURN json_build_object(
      'success', false,
      'message', 'このアカウントは無効化されています。管理者にお問い合わせください。'
    );
  END IF;

  -- ログイン試行回数とブロック時間のチェック
  v_failed_attempts := COALESCE(v_user.failed_login_attempts, 0);
  v_last_failed_at := v_user.last_failed_login;

  -- ブロック期間中かチェック
  IF v_failed_attempts >= v_max_attempts AND
     v_last_failed_at IS NOT NULL AND
     (NOW() - v_last_failed_at) < v_block_duration THEN
    RETURN json_build_object(
      'success', false,
      'message', 'ログイン試行回数の上限に達しました。30分後に再度お試しください。',
      'attempts_remaining', 0
    );
  END IF;

  -- ブロック期間が過ぎていたらリセット
  IF v_failed_attempts >= v_max_attempts AND
     v_last_failed_at IS NOT NULL AND
     (NOW() - v_last_failed_at) >= v_block_duration THEN
    UPDATE admin_auth_users
    SET failed_login_attempts = 0,
        last_failed_login = NULL
    WHERE id = v_user.id;
    v_failed_attempts := 0;
  END IF;

  -- パスワード検証（bcrypt）
  -- pgcrypto拡張が必要: CREATE EXTENSION IF NOT EXISTS pgcrypto;
  BEGIN
    SELECT (password_hash = crypt(p_password, password_hash)) INTO v_password_valid
    FROM admin_auth_users
    WHERE id = v_user.id;
  EXCEPTION WHEN OTHERS THEN
    v_password_valid := false;
  END;

  -- パスワードが正しくない場合
  IF NOT v_password_valid THEN
    -- 失敗回数を増やす
    UPDATE admin_auth_users
    SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
        last_failed_login = NOW()
    WHERE id = v_user.id;

    v_failed_attempts := v_failed_attempts + 1;

    RETURN json_build_object(
      'success', false,
      'message', 'ログインIDまたはパスワードが正しくありません',
      'attempts_remaining', GREATEST(0, v_max_attempts - v_failed_attempts)
    );
  END IF;

  -- 認証成功：失敗回数をリセット、最終ログイン時刻を更新
  UPDATE admin_auth_users
  SET failed_login_attempts = 0,
      last_failed_login = NULL,
      last_login = NOW()
  WHERE id = v_user.id;

  -- ログインログを記録（admin_login_logsテーブルがある場合）
  BEGIN
    INSERT INTO admin_login_logs (user_id, ip_address, success, created_at)
    VALUES (v_user.id, p_ip_address, true, NOW());
  EXCEPTION WHEN undefined_table THEN
    -- テーブルが存在しない場合は無視
    NULL;
  END;

  -- 成功レスポンス
  RETURN json_build_object(
    'success', true,
    'user_id', v_user.id,
    'login_id', v_user.login_id,
    'display_name', v_user.display_name,
    'role', v_user.role,
    'permissions', COALESCE(v_user.permissions, '[]'::jsonb),
    'assigned_store_id', v_user.assigned_store_id
  );
END;
$$;

-- pgcrypto拡張を有効化（bcrypt用）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON FUNCTION authenticate_admin IS '管理者ログイン認証関数（ログイン試行制限付き）';
