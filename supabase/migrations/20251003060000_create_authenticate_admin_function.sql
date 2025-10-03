-- 管理者認証関数を作成
CREATE OR REPLACE FUNCTION public.authenticate_admin(p_login_id text, p_password text, p_ip_address text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user record;
BEGIN
    SELECT * INTO v_user
    FROM admin_auth_users
    WHERE login_id = p_login_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('admin_login_failed', json_build_object('reason', 'invalid_login_id', 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object('success', false, 'message', 'ログインIDまたはパスワードが正しくありません');
    END IF;

    IF v_user.locked_until IS NOT NULL AND v_user.locked_until > now() THEN
        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('admin_login_blocked', json_build_object('locked_until', v_user.locked_until, 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object('success', false, 'message', 'アカウントが一時的にロックされています', 'locked_until', v_user.locked_until);
    END IF;

    IF v_user.password_hash != md5(p_password) THEN
        UPDATE admin_auth_users
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE WHEN failed_attempts >= 4 THEN now() + interval '30 minutes' ELSE NULL END
        WHERE id = v_user.id;

        INSERT INTO admin_access_logs (action, details, ip_address)
        VALUES ('admin_login_failed', json_build_object('reason', 'invalid_password', 'attempts', v_user.failed_attempts + 1, 'login_id', p_login_id), p_ip_address);

        RETURN json_build_object('success', false, 'message', 'ログインIDまたはパスワードが正しくありません', 'attempts_remaining', 5 - (v_user.failed_attempts + 1));
    END IF;

    UPDATE admin_auth_users
    SET failed_attempts = 0, locked_until = NULL, last_login_at = now()
    WHERE id = v_user.id;

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
$function$;

COMMENT ON FUNCTION public.authenticate_admin IS '管理者認証を行う関数';
