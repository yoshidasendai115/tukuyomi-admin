

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."add_accessible_station"("p_store_id" "uuid", "p_station" "text", "p_distance" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_stations JSONB;
  v_new_station JSONB;
BEGIN
  -- 現在のアクセス可能駅リストを取得
  SELECT COALESCE(accessible_stations, '[]'::JSONB)
  INTO v_stations
  FROM stores
  WHERE id = p_store_id;

  -- 新しい駅情報を作成
  v_new_station := jsonb_build_object(
    'station', p_station,
    'distance', p_distance,
    'added_at', NOW()
  );

  -- 既存リストに同じ駅がなければ追加
  IF NOT v_stations @> jsonb_build_array(
    jsonb_build_object('station', p_station)
  ) THEN
    v_stations := v_stations || v_new_station;

    UPDATE stores
    SET accessible_stations = v_stations
    WHERE id = p_store_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."add_accessible_station"("p_store_id" "uuid", "p_station" "text", "p_distance" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."array_distinct"("anyarray") RETURNS "anyarray"
    LANGUAGE "sql" IMMUTABLE
    AS $_$
  SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest($1) x;
$_$;


ALTER FUNCTION "public"."array_distinct"("anyarray") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_broadcast record;
    v_store_id uuid;
    v_read_count integer;
    v_unread_count integer;
    v_total_recipients integer;
BEGIN
    -- メッセージ情報を取得
    SELECT * INTO v_broadcast
    FROM broadcast_messages
    WHERE id = p_broadcast_id;

    -- メッセージが存在しない
    IF v_broadcast IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'メッセージが見つかりません'
        );
    END IF;

    -- 既に取り消されている
    IF v_broadcast.is_cancelled THEN
        RETURN json_build_object(
            'success', false,
            'error', 'このメッセージは既に取り消されています'
        );
    END IF;

    v_store_id := v_broadcast.store_id;

    -- 送信から24時間以上経過している場合は取り消し不可
    IF v_broadcast.sent_at IS NOT NULL AND
       v_broadcast.sent_at < (now() - interval '24 hours') THEN
        RETURN json_build_object(
            'success', false,
            'error', '送信から24時間以上経過したメッセージは取り消せません'
        );
    END IF;

    -- 既読・未読数を取得
    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
    INTO v_total_recipients, v_read_count, v_unread_count
    FROM broadcast_recipients
    WHERE broadcast_id = p_broadcast_id;

    -- トランザクション開始
    -- broadcast_messagesを更新
    UPDATE broadcast_messages
    SET
        is_cancelled = true,
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_broadcast_id;

    -- 関連するmessagesを更新（broadcast_idから直接特定）
    UPDATE messages
    SET is_cancelled = true
    WHERE id IN (
        SELECT m.id
        FROM messages m
        JOIN message_threads mt ON m.thread_id = mt.id
        JOIN broadcast_recipients br ON br.thread_id = mt.id
        WHERE br.broadcast_id = p_broadcast_id
        AND m.content = v_broadcast.content  -- 同じ内容のメッセージのみを対象
    );

    -- 取り消し履歴を記録
    INSERT INTO message_cancellations (
        broadcast_id,
        store_id,
        cancelled_by,
        reason,
        total_recipients,
        read_count,
        unread_count
    ) VALUES (
        p_broadcast_id,
        v_store_id,
        p_token,
        p_reason,
        v_total_recipients,
        v_read_count,
        v_unread_count
    );

    RETURN json_build_object(
        'success', true,
        'broadcast_id', p_broadcast_id,
        'cancelled_at', now(),
        'affected_users', v_total_recipients,
        'read_count', v_read_count,
        'unread_count', v_unread_count
    );
END;
$$;


ALTER FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") IS '一斉送信メッセージを取り消す';



CREATE OR REPLACE FUNCTION "public"."check_store_edit_auth"("p_token" "text", "p_session_token" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_store_edit_auth"("p_token" "text", "p_session_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_store_image_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_count integer;
    max_allowed integer;
BEGIN
    -- 現在の画像数を取得
    SELECT COUNT(*) INTO current_count
    FROM store_images
    WHERE store_id = NEW.store_id;
    
    -- 最大許可数を取得
    SELECT COALESCE(max_images_allowed, 3) INTO max_allowed
    FROM stores
    WHERE id = NEW.store_id;
    
    -- 制限チェック
    IF current_count >= max_allowed THEN
        RAISE EXCEPTION 'Image limit exceeded. Maximum allowed: %', max_allowed;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_store_image_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_view_records"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM store_view_tracking 
  WHERE viewed_at < NOW() - INTERVAL '1 day';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_view_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE reviews 
    SET helpful_count = GREATEST(COALESCE(helpful_count, 0) - 1, 0)
    WHERE id = review_id_param;
END;
$$;


ALTER FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_matching_store"("p_store_name" "text", "p_store_address" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
  DECLARE
      v_store_id uuid;
  BEGIN
      SELECT id INTO v_store_id
      FROM stores
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_store_name))
      LIMIT 1;

      IF v_store_id IS NULL THEN
          SELECT id INTO v_store_id
          FROM stores
          WHERE LOWER(name) LIKE '%' || LOWER(TRIM(p_store_name)) || '%'
          LIMIT 1;
      END IF;

      IF v_store_id IS NULL AND p_store_address IS NOT NULL THEN
          SELECT id INTO v_store_id
          FROM stores
          WHERE (
              LOWER(name) LIKE '%' || LOWER(TRIM(p_store_name)) || '%'
              OR LOWER(address) LIKE '%' || LOWER(TRIM(p_store_address)) || '%'
          )
          LIMIT 1;
      END IF;

      RETURN v_store_id;
  END;
  $$;


ALTER FUNCTION "public"."find_matching_store"("p_store_name" "text", "p_store_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_duplicate_stores"() RETURNS TABLE("google_place_id" "text", "store_count" bigint, "store_names" "text"[], "stations" "text"[], "distances" "text"[])
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.google_place_id,
    COUNT(*) as store_count,
    ARRAY_AGG(s.name ORDER BY s.created_at) as store_names,
    ARRAY_AGG(s.station ORDER BY s.created_at) as stations,
    ARRAY_AGG(s.station_distance ORDER BY s.created_at) as distances
  FROM stores s
  WHERE s.google_place_id IS NOT NULL
  GROUP BY s.google_place_id
  HAVING COUNT(*) > 1
  ORDER BY COUNT(*) DESC;
END;
$$;


ALTER FUNCTION "public"."get_duplicate_stores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_store_broadcast_history"("p_store_id" "uuid", "p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("broadcast_id" "uuid", "title" "text", "content" "text", "message_type" "text", "sent_at" timestamp with time zone, "is_cancelled" boolean, "cancelled_at" timestamp with time zone, "cancellation_reason" "text", "total_recipients" integer, "read_count" integer, "read_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bs.broadcast_id,
        bm.title,
        bm.content,
        bm.message_type,
        bm.sent_at,
        COALESCE(bm.is_cancelled, false) as is_cancelled,
        bm.cancelled_at,
        bm.cancellation_reason,
        bs.total_recipients::integer,
        bs.read_count::integer,
        bs.read_rate
    FROM broadcast_statistics bs
    JOIN broadcast_messages bm ON bs.broadcast_id = bm.id
    WHERE bs.store_id = p_store_id
    AND bm.sent_at IS NOT NULL
    ORDER BY bm.sent_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_store_broadcast_history"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE reviews 
    SET helpful_count = COALESCE(helpful_count, 0) + 1
    WHERE id = review_id_param;
END;
$$;


ALTER FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."send_broadcast_to_favorites"("p_store_id" "uuid", "p_title" "text", "p_content" "text", "p_message_type" "text" DEFAULT 'notification'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_broadcast_id uuid;
    v_recipient_count integer;
    v_user record;
    v_thread_id uuid;
    v_message_id uuid;
BEGIN
    -- 一斉送信メッセージを作成
    INSERT INTO broadcast_messages (
        store_id,
        title,
        content,
        message_type,
        target_audience,
        sent_at
    ) VALUES (
        p_store_id,
        p_title,
        p_content,
        p_message_type,
        'favorites',
        now()
    ) RETURNING id INTO v_broadcast_id;

    v_recipient_count := 0;

    -- お気に入り登録ユーザーに対してメッセージを送信
    FOR v_user IN
        SELECT user_id
        FROM store_favorite_users
        WHERE store_id = p_store_id
    LOOP
        -- メッセージスレッドを作成または取得
        INSERT INTO message_threads (
            store_id,
            user_id,
            thread_type
        ) VALUES (
            p_store_id,
            v_user.user_id,
            'broadcast'
        )
        ON CONFLICT (store_id, user_id)
        DO UPDATE SET updated_at = now()
        RETURNING id INTO v_thread_id;

        -- メッセージを作成
        INSERT INTO messages (
            thread_id,
            sender_type,
            content
        ) VALUES (
            v_thread_id,
            'store',
            p_content
        ) RETURNING id INTO v_message_id;

        -- 受信者リストに追加
        INSERT INTO broadcast_recipients (
            broadcast_id,
            user_id,
            thread_id
        ) VALUES (
            v_broadcast_id,
            v_user.user_id,
            v_thread_id
        );

        v_recipient_count := v_recipient_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'broadcast_id', v_broadcast_id,
        'recipient_count', v_recipient_count,
        'sent_at', now()
    );
END;
$$;


ALTER FUNCTION "public"."send_broadcast_to_favorites"("p_store_id" "uuid", "p_title" "text", "p_content" "text", "p_message_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_cleanup_views"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Run cleanup only 1% of the time to avoid performance impact
  IF random() < 0.01 THEN
    PERFORM cleanup_old_view_records();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_cleanup_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unlock_store_edit_account"("p_credential_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE admin_store_edit_credentials
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE id = p_credential_id;
END;
$$;


ALTER FUNCTION "public"."unlock_store_edit_account"("p_credential_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_nearest_station"("p_google_place_id" "text", "p_new_station" "text", "p_new_distance" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_current_distance INTEGER;
  v_new_distance INTEGER;
  v_store_id UUID;
BEGIN
  -- 距離を数値に変換（「徒歩5分」→ 5）
  v_new_distance := COALESCE(
    (regexp_match(p_new_distance, '(\d+)'))[1]::INTEGER,
    9999
  );

  -- 既存店舗を検索
  SELECT id,
    COALESCE(
      (regexp_match(station_distance, '(\d+)'))[1]::INTEGER,
      9999
    ) INTO v_store_id, v_current_distance
  FROM stores
  WHERE google_place_id = p_google_place_id
  LIMIT 1;

  -- 店舗が存在し、新しい駅の方が近い場合は更新
  IF v_store_id IS NOT NULL AND v_new_distance < v_current_distance THEN
    UPDATE stores
    SET
      station = p_new_station,
      station_distance = p_new_distance,
      updated_at = NOW()
    WHERE id = v_store_id;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."update_nearest_station"("p_google_place_id" "text", "p_new_station" "text", "p_new_distance" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_store_statistics"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- お気に入り数の更新
    UPDATE stores s
    SET favorite_count = (
        SELECT COUNT(*)
        FROM favorite_stores fs
        WHERE fs.store_id = s.id
    );
    
    -- 応募数の更新（applicationsテーブルが存在する場合）
    UPDATE stores s
    SET application_count = (
        SELECT COUNT(*)
        FROM applications a
        WHERE a.store_id = s.id
    )
    WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'applications'
    );
END;
$$;


ALTER FUNCTION "public"."update_store_statistics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_access_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action" "text" NOT NULL,
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_access_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_auth_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "login_id" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "email" "text",
    "role" "text" DEFAULT 'moderator'::"text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "failed_attempts" integer DEFAULT 0,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_auth_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'moderator'::"text"])))
);


ALTER TABLE "public"."admin_auth_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_store_edit_auth_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_id" "uuid",
    "credential_id" "uuid",
    "action" "text",
    "email" "text",
    "ip_address" "text",
    "user_agent" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_store_edit_auth_logs_action_check" CHECK (("action" = ANY (ARRAY['login_attempt'::"text", 'login_success'::"text", 'login_failed'::"text", 'logout'::"text", 'locked'::"text", 'password_changed'::"text"])))
);


ALTER TABLE "public"."admin_store_edit_auth_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_store_edit_auth_logs" IS '店舗編集の認証ログ';



CREATE TABLE IF NOT EXISTS "public"."admin_store_edit_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_id" "uuid",
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "require_auth" boolean DEFAULT false,
    "failed_attempts" integer DEFAULT 0,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_store_edit_credentials" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_store_edit_credentials" IS '店舗編集トークンの認証情報';



COMMENT ON COLUMN "public"."admin_store_edit_credentials"."require_auth" IS '認証を必須にするかどうか';



CREATE TABLE IF NOT EXISTS "public"."admin_store_edit_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_name" "text" NOT NULL,
    "store_address" "text" NOT NULL,
    "store_phone" "text" NOT NULL,
    "applicant_name" "text" NOT NULL,
    "applicant_email" "text" NOT NULL,
    "applicant_phone" "text" NOT NULL,
    "applicant_role" "text" NOT NULL,
    "business_license" "text",
    "additional_info" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "reviewed_at" timestamp with time zone,
    "processed_by" "uuid",
    "business_type" "text" DEFAULT 'other'::"text",
    "store_id" "uuid",
    "document_type" "text" DEFAULT 'restaurant_license'::"text",
    "business_license_image" "text",
    "additional_document_type" "text",
    "additional_document_image" "text",
    "identity_document_image" "text",
    "license_holder_name" "text",
    "applicant_relationship" "text" DEFAULT 'owner'::"text",
    "document_verification_status" "text" DEFAULT 'pending'::"text",
    "verification_notes" "text",
    CONSTRAINT "admin_store_edit_requests_additional_document_type_check" CHECK (("additional_document_type" = ANY (ARRAY['late_night_license'::"text", 'corporate_registry'::"text", 'identity_document'::"text"]))),
    CONSTRAINT "admin_store_edit_requests_applicant_relationship_check" CHECK (("applicant_relationship" = ANY (ARRAY['owner'::"text", 'manager'::"text", 'employee'::"text", 'representative'::"text"]))),
    CONSTRAINT "admin_store_edit_requests_business_type_check" CHECK (("business_type" = ANY (ARRAY['girls_bar'::"text", 'snack'::"text", 'concept_cafe'::"text", 'other'::"text"]))),
    CONSTRAINT "admin_store_edit_requests_document_type_check" CHECK (("document_type" = ANY (ARRAY['restaurant_license'::"text", 'late_night_license'::"text", 'corporate_registry'::"text", 'identity_document'::"text"]))),
    CONSTRAINT "admin_store_edit_requests_document_verification_status_check" CHECK (("document_verification_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'rejected'::"text"]))),
    CONSTRAINT "admin_store_edit_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewing'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."admin_store_edit_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_store_edit_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "token_id" "uuid",
    "credential_id" "uuid",
    "session_token" "text" NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_store_edit_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_store_edit_sessions" IS '店舗編集の認証セッション';



CREATE TABLE IF NOT EXISTS "public"."admin_store_edit_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "store_id" "uuid",
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "use_count" integer DEFAULT 0,
    "max_uses" integer DEFAULT 100,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_used_at" timestamp with time zone
);


ALTER TABLE "public"."admin_store_edit_tokens" OWNER TO "postgres";


COMMENT ON COLUMN "public"."admin_store_edit_tokens"."last_used_at" IS '最終使用日時';



CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "job_id" "uuid",
    "store_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "applied_at" timestamp with time zone DEFAULT "now"(),
    "interview_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."areas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_major" boolean DEFAULT false,
    "is_within_tokyo23" boolean DEFAULT true,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "index_letter" character varying(10),
    "railway_lines" "text"[] DEFAULT '{}'::"text"[],
    "line_orders" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."areas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."broadcast_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'notification'::"text",
    "target_audience" "text" DEFAULT 'favorites'::"text",
    "is_active" boolean DEFAULT true,
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_cancelled" boolean DEFAULT false,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    CONSTRAINT "broadcast_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['notification'::"text", 'campaign'::"text", 'news'::"text", 'other'::"text"]))),
    CONSTRAINT "broadcast_messages_target_audience_check" CHECK (("target_audience" = ANY (ARRAY['all'::"text", 'favorites'::"text", 'applicants'::"text"])))
);


ALTER TABLE "public"."broadcast_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."broadcast_messages" IS '店舗からの一斉送信メッセージ';



COMMENT ON COLUMN "public"."broadcast_messages"."is_cancelled" IS 'メッセージが取り消されたかどうか';



COMMENT ON COLUMN "public"."broadcast_messages"."cancelled_at" IS 'メッセージ取り消し日時';



COMMENT ON COLUMN "public"."broadcast_messages"."cancellation_reason" IS '取り消し理由';



CREATE TABLE IF NOT EXISTS "public"."broadcast_recipients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "broadcast_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "thread_id" "uuid",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."broadcast_recipients" OWNER TO "postgres";


COMMENT ON TABLE "public"."broadcast_recipients" IS '一斉送信メッセージの受信者管理';



CREATE OR REPLACE VIEW "public"."broadcast_statistics" AS
 SELECT "bm"."id" AS "broadcast_id",
    "bm"."store_id",
    "bm"."title",
    "bm"."sent_at",
    COALESCE("bm"."is_cancelled", false) AS "is_cancelled",
    "bm"."cancelled_at",
    "count"("br"."id") AS "total_recipients",
    "count"(
        CASE
            WHEN ("br"."is_read" = true) THEN 1
            ELSE NULL::integer
        END) AS "read_count",
    "count"(
        CASE
            WHEN ("br"."is_deleted" = true) THEN 1
            ELSE NULL::integer
        END) AS "deleted_count",
    "round"(
        CASE
            WHEN ("count"("br"."id") > 0) THEN ((("count"(
            CASE
                WHEN ("br"."is_read" = true) THEN 1
                ELSE NULL::integer
            END))::numeric / ("count"("br"."id"))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS "read_rate"
   FROM ("public"."broadcast_messages" "bm"
     LEFT JOIN "public"."broadcast_recipients" "br" ON (("bm"."id" = "br"."broadcast_id")))
  GROUP BY "bm"."id", "bm"."store_id", "bm"."title", "bm"."sent_at", "bm"."is_cancelled", "bm"."cancelled_at";


ALTER VIEW "public"."broadcast_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cast_profiles" (
    "id" "uuid" NOT NULL,
    "stage_name" character varying(255),
    "avatar_id" character varying(50),
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "age" integer,
    "height" integer,
    "body_type" character varying(50),
    "work_experience" "text",
    "specialties" "text"[],
    "available_areas" "text"[],
    "nearest_area_id" "uuid"
);


ALTER TABLE "public"."cast_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorite_stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "store_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorite_stores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genres" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_visible" boolean DEFAULT true,
    "icon" "text" DEFAULT '🍸'::"text",
    "description" "text"
);


ALTER TABLE "public"."genres" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_profiles" (
    "id" "uuid" NOT NULL,
    "nickname" character varying(255),
    "avatar_id" character varying(50),
    "gender" character varying(10),
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "favorite_genres" "text"[],
    "age_range" integer,
    "birth_date" "date",
    "nearest_station" character varying(255),
    "nearest_area_id" "uuid"
);


ALTER TABLE "public"."guest_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "hourly_wage_min" integer,
    "hourly_wage_max" integer,
    "work_hours" "text",
    "work_days" "text",
    "requirements" "text",
    "benefits" "text",
    "job_type" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "jobs_job_type_check" CHECK (("job_type" = ANY (ARRAY['正社員'::"text", 'アルバイト'::"text", '業務委託'::"text", 'その他'::"text"])))
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_cancellations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "broadcast_id" "uuid",
    "store_id" "uuid",
    "cancelled_by" "text",
    "reason" "text",
    "total_recipients" integer,
    "read_count" integer,
    "unread_count" integer,
    "cancelled_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_cancellations" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_cancellations" IS 'メッセージ取り消し履歴';



CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'notification'::"text",
    "variables" "jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_templates" IS 'メッセージテンプレート';



CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "user_id" "uuid",
    "store_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "thread_type" "text" DEFAULT 'application'::"text",
    CONSTRAINT "message_threads_thread_type_check" CHECK (("thread_type" = ANY (ARRAY['application'::"text", 'broadcast'::"text", 'direct'::"text"])))
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."message_threads"."thread_type" IS 'スレッドの種類: application=求人応募, broadcast=一斉送信, direct=1対1';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid",
    "sender_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_cancelled" boolean DEFAULT false,
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['user'::"text", 'store'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."is_cancelled" IS 'メッセージが取り消されたかどうか';



CREATE TABLE IF NOT EXISTS "public"."notification_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "notification_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" character varying(50) NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "link" "text",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['message'::character varying, 'application'::character varying, 'system'::character varying, 'campaign'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."read" IS 'Deprecated - use notification_reads table instead for per-user read status';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "nickname" "text",
    "birth_date" "date",
    "gender" "text",
    "phone_number" "text",
    "employment_status" "text",
    "work_experience" "text",
    "skills" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_type" character varying(50) DEFAULT 'guest'::character varying,
    CONSTRAINT "profiles_employment_status_check" CHECK (("employment_status" = ANY (ARRAY['在職中'::"text", '離職中'::"text", '学生'::"text", 'その他'::"text"]))),
    CONSTRAINT "profiles_gender_check" CHECK (("gender" = ANY (ARRAY['男性'::"text", '女性'::"text", 'その他'::"text", '回答しない'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_deletion_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "admin_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "processed_at" timestamp with time zone,
    CONSTRAINT "review_deletion_requests_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::"text"[])))
);


ALTER TABLE "public"."review_deletion_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_helpfuls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_helpfuls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" character varying(50) NOT NULL,
    "detail" "text",
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "resolution_note" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "reported_user_id" "uuid",
    "reported_user_name" character varying(255),
    CONSTRAINT "review_reports_reason_check" CHECK ((("reason")::"text" = ANY (ARRAY[('spam'::character varying)::"text", ('inappropriate'::character varying)::"text", ('harassment'::character varying)::"text", ('false'::character varying)::"text", ('privacy'::character varying)::"text", ('other'::character varying)::"text"]))),
    CONSTRAINT "review_reports_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('pending'::character varying)::"text", ('reviewing'::character varying)::"text", ('resolved'::character varying)::"text", ('dismissed'::character varying)::"text"])))
);


ALTER TABLE "public"."review_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "user_id" "uuid",
    "rating" integer,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "work_period" "text",
    "is_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "detail_ratings" "jsonb",
    "guest_ratings" "jsonb",
    "helpful_count" integer DEFAULT 0,
    "images" "text"[],
    "reviewer_type" character varying(20) DEFAULT 'guest'::character varying,
    "work_status" "text",
    "reviewer_nickname" "text",
    "reviewer_avatar_icon" character varying(50),
    "is_deleted_account" boolean DEFAULT false,
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."station_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "area_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "walking_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."station_group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."station_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_major_terminal" boolean DEFAULT false,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."station_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_edit_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "edited_by" "uuid",
    "edit_type" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "edited_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_edit_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."store_favorite_users" AS
 SELECT "fs"."store_id",
    "fs"."user_id",
    "fs"."created_at" AS "favorited_at",
    "u"."email",
    ("u"."raw_user_meta_data" ->> 'name'::"text") AS "user_name"
   FROM ("public"."favorite_stores" "fs"
     LEFT JOIN "auth"."users" "u" ON (("fs"."user_id" = "u"."id")))
  WHERE ("u"."deleted_at" IS NULL);


ALTER VIEW "public"."store_favorite_users" OWNER TO "postgres";


COMMENT ON VIEW "public"."store_favorite_users" IS '店舗のお気に入り登録ユーザー一覧';



CREATE TABLE IF NOT EXISTS "public"."store_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "caption" "text",
    "display_order" integer DEFAULT 0,
    "is_main" boolean DEFAULT false,
    "image_type" "text" DEFAULT 'general'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "store_images_image_type_check" CHECK (("image_type" = ANY (ARRAY['main'::"text", 'interior'::"text", 'exterior'::"text", 'staff'::"text", 'menu'::"text", 'other'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."store_images" OWNER TO "postgres";


COMMENT ON TABLE "public"."store_images" IS '店舗画像管理テーブル';



COMMENT ON COLUMN "public"."store_images"."image_type" IS '画像タイプ: main=メイン, interior=内装, exterior=外装, staff=スタッフ, menu=メニュー, other=その他';



CREATE TABLE IF NOT EXISTS "public"."store_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "image_url" "text",
    "is_important" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."store_messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."store_messages"."expires_at" IS '表示有効期限。NULLの場合は無期限表示';



CREATE TABLE IF NOT EXISTS "public"."store_owner_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "note" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_owner_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_view_tracking" (
    "store_id" "uuid" NOT NULL,
    "ip_hash" "text" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_view_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."store_view_tracking" IS 'Tracks store page views to prevent duplicate counting within 1 hour';



COMMENT ON COLUMN "public"."store_view_tracking"."ip_hash" IS 'SHA256 hash of IP address for privacy protection';



CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "area_id" "uuid",
    "genre_id" "uuid",
    "description" "text",
    "address" "text",
    "phone_number" "text",
    "business_hours" "text",
    "regular_holiday" "text",
    "thumbnail_url" "text",
    "images" "text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "station" "text",
    "station_line" "text",
    "station_distance" "text",
    "google_place_id" "text",
    "google_maps_uri" "text",
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "price_level" "text",
    "website" "text",
    "rating" numeric(2,1),
    "review_count" integer DEFAULT 0,
    "area" "text",
    "features" "text"[],
    "genre" "text",
    "opening_hours_text" "text"[],
    "tags" "text"[],
    "view_count" integer DEFAULT 0,
    "owner_id" "uuid",
    "email" "text",
    "line_id" "text",
    "minimum_hourly_wage" integer,
    "maximum_hourly_wage" integer,
    "average_daily_income" integer,
    "average_monthly_income" integer,
    "work_system" "text",
    "recruitment_status" "text" DEFAULT 'active'::"text",
    "treatment_benefits" "text",
    "working_conditions" "text",
    "dress_code" "text",
    "target_age_min" integer,
    "target_age_max" integer,
    "recruitment_message" "text",
    "store_features" "text"[],
    "payment_system" "text",
    "back_rate" "text",
    "dormitory_available" boolean DEFAULT false,
    "dormitory_details" "text",
    "daycare_available" boolean DEFAULT false,
    "daycare_details" "text",
    "trial_period" "text",
    "trial_conditions" "text",
    "interview_location" "text",
    "interview_flow" "text",
    "sns_instagram" "text",
    "sns_twitter" "text",
    "sns_tiktok" "text",
    "last_updated_by" "uuid",
    "favorite_count" integer DEFAULT 0,
    "application_count" integer DEFAULT 0,
    "plan_type" "text" DEFAULT 'free'::"text",
    "plan_expires_at" timestamp with time zone,
    "max_images_allowed" integer DEFAULT 3,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "custom_notes" "text",
    "image_url" "text",
    "additional_images" "text"[] DEFAULT '{}'::"text"[],
    "accessible_stations" "jsonb" DEFAULT '[]'::"jsonb",
    "hours_monday_open" time without time zone,
    "hours_monday_close" time without time zone,
    "hours_monday_closed" boolean DEFAULT false,
    "hours_tuesday_open" time without time zone,
    "hours_tuesday_close" time without time zone,
    "hours_tuesday_closed" boolean DEFAULT false,
    "hours_wednesday_open" time without time zone,
    "hours_wednesday_close" time without time zone,
    "hours_wednesday_closed" boolean DEFAULT false,
    "hours_thursday_open" time without time zone,
    "hours_thursday_close" time without time zone,
    "hours_thursday_closed" boolean DEFAULT false,
    "hours_friday_open" time without time zone,
    "hours_friday_close" time without time zone,
    "hours_friday_closed" boolean DEFAULT false,
    "hours_saturday_open" time without time zone,
    "hours_saturday_close" time without time zone,
    "hours_saturday_closed" boolean DEFAULT false,
    "hours_sunday_open" time without time zone,
    "hours_sunday_close" time without time zone,
    "hours_sunday_closed" boolean DEFAULT false,
    "contact_phone_for_ga" "text",
    "is_recommended" boolean DEFAULT false,
    "priority_score" integer DEFAULT 0,
    "recommendation_reason" "text",
    "recommended_at" timestamp with time zone,
    "recommended_by" "uuid",
    CONSTRAINT "stores_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['free'::"text", 'basic'::"text", 'premium'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "stores_priority_score_check" CHECK ((("priority_score" >= 0) AND ("priority_score" <= 100))),
    CONSTRAINT "stores_recruitment_status_check" CHECK (("recruitment_status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."stores"."recruitment_status" IS '募集状態: active=募集中, paused=一時停止, closed=募集終了';



COMMENT ON COLUMN "public"."stores"."plan_type" IS 'プランタイプ: free=無料（画像3枚）, basic=ベーシック, premium=プレミアム, enterprise=エンタープライズ';



COMMENT ON COLUMN "public"."stores"."custom_notes" IS '店舗オーナーが自由に記入できるメモ・お知らせ欄';



COMMENT ON COLUMN "public"."stores"."image_url" IS 'Main store image URL';



COMMENT ON COLUMN "public"."stores"."additional_images" IS 'Array of additional store image URLs (up to 3)';



COMMENT ON COLUMN "public"."stores"."accessible_stations" IS '複数駅からのアクセス情報を保持するJSON配列';



COMMENT ON COLUMN "public"."stores"."hours_monday_open" IS '月曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_monday_close" IS '月曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_monday_closed" IS '月曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."hours_tuesday_open" IS '火曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_tuesday_close" IS '火曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_tuesday_closed" IS '火曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."hours_wednesday_open" IS '水曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_wednesday_close" IS '水曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_wednesday_closed" IS '水曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."hours_thursday_open" IS '木曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_thursday_close" IS '木曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_thursday_closed" IS '木曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."hours_friday_open" IS '金曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_friday_close" IS '金曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_friday_closed" IS '金曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."hours_saturday_open" IS '土曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_saturday_close" IS '土曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_saturday_closed" IS '土曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."hours_sunday_open" IS '日曜日開店時刻';



COMMENT ON COLUMN "public"."stores"."hours_sunday_close" IS '日曜日閉店時刻';



COMMENT ON COLUMN "public"."stores"."hours_sunday_closed" IS '日曜日休業フラグ';



COMMENT ON COLUMN "public"."stores"."contact_phone_for_ga" IS 'GA社から店舗への連絡用電話番号（お客様向けの掲載電話番号とは異なる）';



COMMENT ON COLUMN "public"."stores"."is_recommended" IS 'システム管理者が設定するおすすめ店舗フラグ';



COMMENT ON COLUMN "public"."stores"."priority_score" IS '優先表示の重み付け（0-100、高いほど優先）';



COMMENT ON COLUMN "public"."stores"."recommendation_reason" IS 'おすすめ理由';



COMMENT ON COLUMN "public"."stores"."recommended_at" IS 'おすすめ設定日時';



COMMENT ON COLUMN "public"."stores"."recommended_by" IS '設定した管理者のID';



CREATE TABLE IF NOT EXISTS "public"."user_store_message_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_store_message_reads" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_store_station_summary" AS
 SELECT "s"."id",
    "s"."name" AS "store_name",
    "s"."google_place_id",
    "s"."station" AS "primary_station",
    "s"."station_distance" AS "primary_distance",
    "a"."name" AS "area_name",
    "jsonb_array_length"(COALESCE("s"."accessible_stations", '[]'::"jsonb")) AS "accessible_station_count",
    "s"."created_at",
    "s"."updated_at"
   FROM ("public"."stores" "s"
     LEFT JOIN "public"."areas" "a" ON (("s"."area_id" = "a"."id")))
  ORDER BY "s"."created_at" DESC;


ALTER VIEW "public"."v_store_station_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_store_statistics" AS
 SELECT "count"(*) AS "total_stores",
    "count"(DISTINCT "google_place_id") AS "unique_stores",
    "count"(*) FILTER (WHERE ("google_place_id" IS NULL)) AS "stores_without_google_id",
    "count"(*) FILTER (WHERE ("station" IS NOT NULL)) AS "stores_with_station",
    "count"(*) FILTER (WHERE ("jsonb_array_length"(COALESCE("accessible_stations", '[]'::"jsonb")) > 0)) AS "stores_with_multiple_stations"
   FROM "public"."stores";


ALTER VIEW "public"."v_store_statistics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visited_stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "store_id" "uuid",
    "visited_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."visited_stores" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."visited_stores_stats" AS
 SELECT "store_id",
    "count"(DISTINCT "user_id") AS "total_visits",
    "max"("visited_at") AS "last_visited"
   FROM "public"."visited_stores"
  GROUP BY "store_id";


ALTER VIEW "public"."visited_stores_stats" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_access_logs"
    ADD CONSTRAINT "admin_access_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_auth_users"
    ADD CONSTRAINT "admin_auth_users_login_id_key" UNIQUE ("login_id");



ALTER TABLE ONLY "public"."admin_auth_users"
    ADD CONSTRAINT "admin_auth_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_auth_logs"
    ADD CONSTRAINT "admin_store_edit_auth_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_credentials"
    ADD CONSTRAINT "admin_store_edit_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_credentials"
    ADD CONSTRAINT "admin_store_edit_credentials_token_id_key" UNIQUE ("token_id");



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_sessions"
    ADD CONSTRAINT "admin_store_edit_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_sessions"
    ADD CONSTRAINT "admin_store_edit_sessions_session_token_key" UNIQUE ("session_token");



ALTER TABLE ONLY "public"."admin_store_edit_tokens"
    ADD CONSTRAINT "admin_store_edit_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_tokens"
    ADD CONSTRAINT "admin_store_edit_tokens_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."areas"
    ADD CONSTRAINT "areas_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."areas"
    ADD CONSTRAINT "areas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcast_messages"
    ADD CONSTRAINT "broadcast_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cast_profiles"
    ADD CONSTRAINT "cast_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_stores"
    ADD CONSTRAINT "favorite_stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_stores"
    ADD CONSTRAINT "favorite_stores_user_id_store_id_key" UNIQUE ("user_id", "store_id");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guest_profiles"
    ADD CONSTRAINT "guest_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_cancellations"
    ADD CONSTRAINT "message_cancellations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_store_user_unique" UNIQUE ("store_id", "user_id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_user_id_notification_id_key" UNIQUE ("user_id", "notification_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."review_deletion_requests"
    ADD CONSTRAINT "review_deletion_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_helpfuls"
    ADD CONSTRAINT "review_helpfuls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_helpfuls"
    ADD CONSTRAINT "review_helpfuls_review_id_user_id_key" UNIQUE ("review_id", "user_id");



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_review_id_reporter_id_key" UNIQUE ("review_id", "reporter_id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_group_id_area_id_key" UNIQUE ("group_id", "area_id");



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."station_groups"
    ADD CONSTRAINT "station_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."station_groups"
    ADD CONSTRAINT "station_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_edit_history"
    ADD CONSTRAINT "store_edit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_images"
    ADD CONSTRAINT "store_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_messages"
    ADD CONSTRAINT "store_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_owner_notes"
    ADD CONSTRAINT "store_owner_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_view_tracking"
    ADD CONSTRAINT "store_view_tracking_pkey" PRIMARY KEY ("store_id", "ip_hash");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_google_place_id_key" UNIQUE ("google_place_id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_google_place_id_unique" UNIQUE ("google_place_id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_store_message_reads"
    ADD CONSTRAINT "user_store_message_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_store_message_reads"
    ADD CONSTRAINT "user_store_message_reads_user_id_message_id_key" UNIQUE ("user_id", "message_id");



ALTER TABLE ONLY "public"."visited_stores"
    ADD CONSTRAINT "visited_stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visited_stores"
    ADD CONSTRAINT "visited_stores_user_id_store_id_key" UNIQUE ("user_id", "store_id");



CREATE INDEX "idx_admin_auth_users_is_active" ON "public"."admin_auth_users" USING "btree" ("is_active");



CREATE INDEX "idx_admin_auth_users_login_id" ON "public"."admin_auth_users" USING "btree" ("login_id");



CREATE INDEX "idx_admin_store_edit_auth_logs_created_at" ON "public"."admin_store_edit_auth_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_admin_store_edit_auth_logs_token_id" ON "public"."admin_store_edit_auth_logs" USING "btree" ("token_id");



CREATE INDEX "idx_admin_store_edit_credentials_email" ON "public"."admin_store_edit_credentials" USING "btree" ("email");



CREATE INDEX "idx_admin_store_edit_credentials_token_id" ON "public"."admin_store_edit_credentials" USING "btree" ("token_id");



CREATE INDEX "idx_admin_store_edit_requests_business_type" ON "public"."admin_store_edit_requests" USING "btree" ("business_type");



CREATE INDEX "idx_admin_store_edit_requests_document_type" ON "public"."admin_store_edit_requests" USING "btree" ("document_type");



CREATE INDEX "idx_admin_store_edit_requests_store_id" ON "public"."admin_store_edit_requests" USING "btree" ("store_id");



CREATE INDEX "idx_admin_store_edit_requests_verification_status" ON "public"."admin_store_edit_requests" USING "btree" ("document_verification_status");



CREATE INDEX "idx_admin_store_edit_sessions_expires_at" ON "public"."admin_store_edit_sessions" USING "btree" ("expires_at");



CREATE INDEX "idx_admin_store_edit_sessions_token" ON "public"."admin_store_edit_sessions" USING "btree" ("session_token");



CREATE INDEX "idx_applications_job_id" ON "public"."applications" USING "btree" ("job_id");



CREATE INDEX "idx_applications_user_id" ON "public"."applications" USING "btree" ("user_id");



CREATE INDEX "idx_areas_index_letter" ON "public"."areas" USING "btree" ("index_letter");



CREATE INDEX "idx_areas_is_major" ON "public"."areas" USING "btree" ("is_major") WHERE ("is_major" = true);



CREATE INDEX "idx_areas_railway_lines" ON "public"."areas" USING "gin" ("railway_lines");



CREATE INDEX "idx_broadcast_messages_is_cancelled" ON "public"."broadcast_messages" USING "btree" ("is_cancelled");



CREATE INDEX "idx_broadcast_messages_sent_at" ON "public"."broadcast_messages" USING "btree" ("sent_at" DESC);



CREATE INDEX "idx_broadcast_messages_store_id" ON "public"."broadcast_messages" USING "btree" ("store_id");



CREATE INDEX "idx_broadcast_recipients_broadcast_id" ON "public"."broadcast_recipients" USING "btree" ("broadcast_id");



CREATE INDEX "idx_broadcast_recipients_is_read" ON "public"."broadcast_recipients" USING "btree" ("is_read");



CREATE INDEX "idx_broadcast_recipients_user_id" ON "public"."broadcast_recipients" USING "btree" ("user_id");



CREATE INDEX "idx_cast_profiles_nearest_area_id" ON "public"."cast_profiles" USING "btree" ("nearest_area_id");



CREATE INDEX "idx_favorite_stores_user_id" ON "public"."favorite_stores" USING "btree" ("user_id");



CREATE INDEX "idx_guest_profiles_nearest_area_id" ON "public"."guest_profiles" USING "btree" ("nearest_area_id");



CREATE INDEX "idx_jobs_store_id" ON "public"."jobs" USING "btree" ("store_id");



CREATE INDEX "idx_message_cancellations_broadcast_id" ON "public"."message_cancellations" USING "btree" ("broadcast_id");



CREATE INDEX "idx_message_cancellations_cancelled_at" ON "public"."message_cancellations" USING "btree" ("cancelled_at" DESC);



CREATE INDEX "idx_message_cancellations_store_id" ON "public"."message_cancellations" USING "btree" ("store_id");



CREATE INDEX "idx_message_templates_store_id" ON "public"."message_templates" USING "btree" ("store_id");



CREATE INDEX "idx_message_threads_application_id" ON "public"."message_threads" USING "btree" ("application_id");



CREATE INDEX "idx_message_threads_store_id" ON "public"."message_threads" USING "btree" ("store_id");



CREATE INDEX "idx_message_threads_thread_type" ON "public"."message_threads" USING "btree" ("thread_type");



CREATE INDEX "idx_messages_thread_id" ON "public"."messages" USING "btree" ("thread_id");



CREATE INDEX "idx_notification_reads_notification_id" ON "public"."notification_reads" USING "btree" ("notification_id");



CREATE INDEX "idx_notification_reads_user_id" ON "public"."notification_reads" USING "btree" ("user_id");



CREATE INDEX "idx_notification_reads_user_notification" ON "public"."notification_reads" USING "btree" ("user_id", "notification_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_requests_created" ON "public"."admin_store_edit_requests" USING "btree" ("created_at");



CREATE INDEX "idx_requests_status" ON "public"."admin_store_edit_requests" USING "btree" ("status");



CREATE INDEX "idx_review_deletion_requests_review_id" ON "public"."review_deletion_requests" USING "btree" ("review_id");



CREATE INDEX "idx_review_deletion_requests_status" ON "public"."review_deletion_requests" USING "btree" ("status");



CREATE INDEX "idx_review_deletion_requests_user_id" ON "public"."review_deletion_requests" USING "btree" ("user_id");



CREATE INDEX "idx_review_helpfuls_review_id" ON "public"."review_helpfuls" USING "btree" ("review_id");



CREATE INDEX "idx_review_helpfuls_user_id" ON "public"."review_helpfuls" USING "btree" ("user_id");



CREATE INDEX "idx_review_reports_created_at" ON "public"."review_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_review_reports_reporter_id" ON "public"."review_reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_review_reports_review_id" ON "public"."review_reports" USING "btree" ("review_id");



CREATE INDEX "idx_review_reports_status" ON "public"."review_reports" USING "btree" ("status");



CREATE INDEX "idx_reviews_is_deleted_account" ON "public"."reviews" USING "btree" ("is_deleted_account");



CREATE INDEX "idx_reviews_reviewer_type" ON "public"."reviews" USING "btree" ("reviewer_type");



CREATE INDEX "idx_reviews_store_id" ON "public"."reviews" USING "btree" ("store_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_station_group_members_area_id" ON "public"."station_group_members" USING "btree" ("area_id");



CREATE INDEX "idx_station_group_members_group_id" ON "public"."station_group_members" USING "btree" ("group_id");



CREATE INDEX "idx_store_edit_history_edited_at" ON "public"."store_edit_history" USING "btree" ("edited_at" DESC);



CREATE INDEX "idx_store_edit_history_store_id" ON "public"."store_edit_history" USING "btree" ("store_id");



CREATE INDEX "idx_store_images_display_order" ON "public"."store_images" USING "btree" ("display_order");



CREATE INDEX "idx_store_images_store_id" ON "public"."store_images" USING "btree" ("store_id");



CREATE INDEX "idx_store_messages_created_at" ON "public"."store_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_store_messages_expires_at" ON "public"."store_messages" USING "btree" ("expires_at");



CREATE INDEX "idx_store_messages_store_id" ON "public"."store_messages" USING "btree" ("store_id");



CREATE INDEX "idx_store_owner_notes_store_id" ON "public"."store_owner_notes" USING "btree" ("store_id");



CREATE INDEX "idx_store_view_tracking_viewed_at" ON "public"."store_view_tracking" USING "btree" ("viewed_at");



CREATE INDEX "idx_stores_accessible_stations" ON "public"."stores" USING "gin" ("accessible_stations");



CREATE INDEX "idx_stores_area" ON "public"."stores" USING "btree" ("area");



CREATE INDEX "idx_stores_area_id" ON "public"."stores" USING "btree" ("area_id");



CREATE INDEX "idx_stores_area_station" ON "public"."stores" USING "btree" ("area_id", "station") WHERE ("area_id" IS NOT NULL);



CREATE INDEX "idx_stores_genre" ON "public"."stores" USING "btree" ("genre");



CREATE INDEX "idx_stores_genre_id" ON "public"."stores" USING "btree" ("genre_id");



CREATE INDEX "idx_stores_google_place_id" ON "public"."stores" USING "btree" ("google_place_id") WHERE ("google_place_id" IS NOT NULL);



CREATE INDEX "idx_stores_is_recommended" ON "public"."stores" USING "btree" ("is_recommended");



CREATE INDEX "idx_stores_priority_score" ON "public"."stores" USING "btree" ("priority_score" DESC);



CREATE INDEX "idx_stores_recommended_priority" ON "public"."stores" USING "btree" ("is_recommended", "priority_score" DESC) WHERE ("is_recommended" = true);



CREATE INDEX "idx_stores_station" ON "public"."stores" USING "btree" ("station");



CREATE INDEX "idx_stores_station_distance" ON "public"."stores" USING "btree" ("station_distance") WHERE ("station_distance" IS NOT NULL);



CREATE INDEX "idx_tokens_expires" ON "public"."admin_store_edit_tokens" USING "btree" ("expires_at");



CREATE INDEX "idx_tokens_token" ON "public"."admin_store_edit_tokens" USING "btree" ("token");



CREATE INDEX "idx_user_store_message_reads_message_id" ON "public"."user_store_message_reads" USING "btree" ("message_id");



CREATE INDEX "idx_user_store_message_reads_user_id" ON "public"."user_store_message_reads" USING "btree" ("user_id");



CREATE INDEX "idx_visited_stores_store_id" ON "public"."visited_stores" USING "btree" ("store_id");



CREATE INDEX "idx_visited_stores_user_id" ON "public"."visited_stores" USING "btree" ("user_id");



CREATE INDEX "idx_visited_stores_visited_at" ON "public"."visited_stores" USING "btree" ("visited_at" DESC);



CREATE OR REPLACE TRIGGER "cleanup_store_views_trigger" AFTER INSERT ON "public"."store_view_tracking" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_cleanup_views"();



CREATE OR REPLACE TRIGGER "enforce_store_image_limit" BEFORE INSERT ON "public"."store_images" FOR EACH ROW EXECUTE FUNCTION "public"."check_store_image_limit"();



CREATE OR REPLACE TRIGGER "update_admin_users_updated_at" BEFORE UPDATE ON "public"."admin_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_store_images_updated_at" BEFORE UPDATE ON "public"."store_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stores_updated_at" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_store_edit_auth_logs"
    ADD CONSTRAINT "admin_store_edit_auth_logs_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."admin_store_edit_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_store_edit_auth_logs"
    ADD CONSTRAINT "admin_store_edit_auth_logs_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."admin_store_edit_tokens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_store_edit_credentials"
    ADD CONSTRAINT "admin_store_edit_credentials_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."admin_store_edit_tokens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."admin_auth_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_store_edit_sessions"
    ADD CONSTRAINT "admin_store_edit_sessions_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."admin_store_edit_credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_store_edit_sessions"
    ADD CONSTRAINT "admin_store_edit_sessions_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "public"."admin_store_edit_tokens"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_store_edit_tokens"
    ADD CONSTRAINT "admin_store_edit_tokens_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."admin_store_edit_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcast_messages"
    ADD CONSTRAINT "broadcast_messages_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcast_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."broadcast_recipients"
    ADD CONSTRAINT "broadcast_recipients_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cast_profiles"
    ADD CONSTRAINT "cast_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cast_profiles"
    ADD CONSTRAINT "cast_profiles_nearest_area_id_fkey" FOREIGN KEY ("nearest_area_id") REFERENCES "public"."areas"("id");



ALTER TABLE ONLY "public"."favorite_stores"
    ADD CONSTRAINT "favorite_stores_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_profiles"
    ADD CONSTRAINT "guest_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_profiles"
    ADD CONSTRAINT "guest_profiles_nearest_area_id_fkey" FOREIGN KEY ("nearest_area_id") REFERENCES "public"."areas"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_cancellations"
    ADD CONSTRAINT "message_cancellations_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcast_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_cancellations"
    ADD CONSTRAINT "message_cancellations_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_templates"
    ADD CONSTRAINT "message_templates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."message_threads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_deletion_requests"
    ADD CONSTRAINT "review_deletion_requests_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_helpfuls"
    ADD CONSTRAINT "review_helpfuls_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."station_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_edit_history"
    ADD CONSTRAINT "store_edit_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."store_edit_history"
    ADD CONSTRAINT "store_edit_history_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_images"
    ADD CONSTRAINT "store_images_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_messages"
    ADD CONSTRAINT "store_messages_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_owner_notes"
    ADD CONSTRAINT "store_owner_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."store_owner_notes"
    ADD CONSTRAINT "store_owner_notes_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_view_tracking"
    ADD CONSTRAINT "store_view_tracking_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_store_message_reads"
    ADD CONSTRAINT "user_store_message_reads_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."store_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visited_stores"
    ADD CONSTRAINT "visited_stores_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visited_stores"
    ADD CONSTRAINT "visited_stores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to add helpful" ON "public"."review_helpfuls" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow authenticated users to delete messages" ON "public"."messages" FOR DELETE USING (true);



CREATE POLICY "Allow authenticated users to insert messages" ON "public"."messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update stores temporarily" ON "public"."stores" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access" ON "public"."areas" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."cast_profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."genres" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."guest_profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."review_helpfuls" FOR SELECT USING (true);



CREATE POLICY "Allow public read access" ON "public"."stores" FOR SELECT USING (true);



CREATE POLICY "Allow users to remove their helpful" ON "public"."review_helpfuls" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow users to update message read status" ON "public"."messages" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can view store images" ON "public"."store_images" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can insert reviews" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Everyone can read store messages" ON "public"."store_messages" FOR SELECT USING (true);



CREATE POLICY "No direct access to admin auth users" ON "public"."admin_auth_users" USING (false);



CREATE POLICY "Public applications are viewable by everyone" ON "public"."applications" FOR SELECT USING (true);



CREATE POLICY "Public jobs are viewable by everyone" ON "public"."jobs" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public message threads are viewable by everyone" ON "public"."message_threads" FOR SELECT USING (true);



CREATE POLICY "Public messages are viewable by everyone" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Public reviews are viewable by everyone" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "Store owners can manage their images" ON "public"."store_images" USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "store_images"."store_id") AND ("stores"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Store owners can manage their notes" ON "public"."store_owner_notes" USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "store_owner_notes"."store_id") AND ("stores"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Store owners can update their stores" ON "public"."stores" FOR UPDATE USING (("owner_id" = "auth"."uid"())) WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Store owners can view their edit history" ON "public"."store_edit_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "store_edit_history"."store_id") AND ("stores"."owner_id" = "auth"."uid"())))));



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create deletion requests for their reviews" ON "public"."review_deletion_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own favorites" ON "public"."favorite_stores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own visited stores" ON "public"."visited_stores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own cast profile" ON "public"."cast_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own favorites" ON "public"."favorite_stores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own guest profile" ON "public"."guest_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own notification reads" ON "public"."notification_reads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reports" ON "public"."review_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can insert own visited stores" ON "public"."visited_stores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK (((("auth"."uid"())::"text" = ("user_id")::"text") OR (("auth"."uid"())::"text" = ("id")::"text")));



CREATE POLICY "Users can manage their own read status" ON "public"."user_store_message_reads" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own notification reads" ON "public"."notification_reads" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own notifications" ON "public"."notifications" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can update own cast profile" ON "public"."cast_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own guest profile" ON "public"."guest_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own notification reads" ON "public"."notification_reads" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (((("auth"."uid"())::"text" = ("user_id")::"text") OR (("auth"."uid"())::"text" = ("id")::"text")));



CREATE POLICY "Users can view own favorites" ON "public"."favorite_stores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reports" ON "public"."review_reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view own visited stores" ON "public"."visited_stores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their deletion requests" ON "public"."review_deletion_requests" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_auth_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users_select_policy" ON "public"."admin_users" FOR SELECT USING (("auth"."uid"() IN ( SELECT "admin_users_1"."user_id"
   FROM "public"."admin_users" "admin_users_1"
  WHERE ("admin_users_1"."is_active" = true))));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."areas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cast_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."favorite_stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."genres" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."guest_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_threads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_deletion_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_helpfuls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_edit_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_images" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_owner_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_view_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_store_message_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visited_stores" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_accessible_station"("p_store_id" "uuid", "p_station" "text", "p_distance" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_accessible_station"("p_store_id" "uuid", "p_station" "text", "p_distance" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_accessible_station"("p_store_id" "uuid", "p_station" "text", "p_distance" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."array_distinct"("anyarray") TO "anon";
GRANT ALL ON FUNCTION "public"."array_distinct"("anyarray") TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_distinct"("anyarray") TO "service_role";



GRANT ALL ON FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_store_edit_auth"("p_token" "text", "p_session_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_store_edit_auth"("p_token" "text", "p_session_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_store_edit_auth"("p_token" "text", "p_session_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_store_image_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_store_image_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_store_image_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_view_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_view_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_view_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."find_matching_store"("p_store_name" "text", "p_store_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."find_matching_store"("p_store_name" "text", "p_store_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_matching_store"("p_store_name" "text", "p_store_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_duplicate_stores"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_duplicate_stores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_duplicate_stores"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_store_broadcast_history"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_store_broadcast_history"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_store_broadcast_history"("p_store_id" "uuid", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."send_broadcast_to_favorites"("p_store_id" "uuid", "p_title" "text", "p_content" "text", "p_message_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."send_broadcast_to_favorites"("p_store_id" "uuid", "p_title" "text", "p_content" "text", "p_message_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."send_broadcast_to_favorites"("p_store_id" "uuid", "p_title" "text", "p_content" "text", "p_message_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_cleanup_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_cleanup_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unlock_store_edit_account"("p_credential_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unlock_store_edit_account"("p_credential_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unlock_store_edit_account"("p_credential_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_nearest_station"("p_google_place_id" "text", "p_new_station" "text", "p_new_distance" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_nearest_station"("p_google_place_id" "text", "p_new_station" "text", "p_new_distance" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_nearest_station"("p_google_place_id" "text", "p_new_station" "text", "p_new_distance" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_store_statistics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_store_statistics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_store_statistics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."admin_access_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_access_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_access_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_auth_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_auth_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_auth_users" TO "service_role";



GRANT ALL ON TABLE "public"."admin_store_edit_auth_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_store_edit_auth_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_store_edit_auth_logs" TO "service_role";



GRANT ALL ON TABLE "public"."admin_store_edit_credentials" TO "anon";
GRANT ALL ON TABLE "public"."admin_store_edit_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_store_edit_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."admin_store_edit_requests" TO "anon";
GRANT ALL ON TABLE "public"."admin_store_edit_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_store_edit_requests" TO "service_role";



GRANT ALL ON TABLE "public"."admin_store_edit_sessions" TO "anon";
GRANT ALL ON TABLE "public"."admin_store_edit_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_store_edit_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."admin_store_edit_tokens" TO "anon";
GRANT ALL ON TABLE "public"."admin_store_edit_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_store_edit_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."areas" TO "anon";
GRANT ALL ON TABLE "public"."areas" TO "authenticated";
GRANT ALL ON TABLE "public"."areas" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_messages" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_messages" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_recipients" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_statistics" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."cast_profiles" TO "anon";
GRANT ALL ON TABLE "public"."cast_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."cast_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."favorite_stores" TO "anon";
GRANT ALL ON TABLE "public"."favorite_stores" TO "authenticated";
GRANT ALL ON TABLE "public"."favorite_stores" TO "service_role";



GRANT ALL ON TABLE "public"."genres" TO "anon";
GRANT ALL ON TABLE "public"."genres" TO "authenticated";
GRANT ALL ON TABLE "public"."genres" TO "service_role";



GRANT ALL ON TABLE "public"."guest_profiles" TO "anon";
GRANT ALL ON TABLE "public"."guest_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."guest_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."message_cancellations" TO "anon";
GRANT ALL ON TABLE "public"."message_cancellations" TO "authenticated";
GRANT ALL ON TABLE "public"."message_cancellations" TO "service_role";



GRANT ALL ON TABLE "public"."message_templates" TO "anon";
GRANT ALL ON TABLE "public"."message_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."message_templates" TO "service_role";



GRANT ALL ON TABLE "public"."message_threads" TO "anon";
GRANT ALL ON TABLE "public"."message_threads" TO "authenticated";
GRANT ALL ON TABLE "public"."message_threads" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."notification_reads" TO "anon";
GRANT ALL ON TABLE "public"."notification_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_reads" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."review_deletion_requests" TO "anon";
GRANT ALL ON TABLE "public"."review_deletion_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."review_deletion_requests" TO "service_role";



GRANT ALL ON TABLE "public"."review_helpfuls" TO "anon";
GRANT ALL ON TABLE "public"."review_helpfuls" TO "authenticated";
GRANT ALL ON TABLE "public"."review_helpfuls" TO "service_role";



GRANT ALL ON TABLE "public"."review_reports" TO "anon";
GRANT ALL ON TABLE "public"."review_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."review_reports" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."station_group_members" TO "anon";
GRANT ALL ON TABLE "public"."station_group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."station_group_members" TO "service_role";



GRANT ALL ON TABLE "public"."station_groups" TO "anon";
GRANT ALL ON TABLE "public"."station_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."station_groups" TO "service_role";



GRANT ALL ON TABLE "public"."store_edit_history" TO "anon";
GRANT ALL ON TABLE "public"."store_edit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."store_edit_history" TO "service_role";



GRANT ALL ON TABLE "public"."store_favorite_users" TO "anon";
GRANT ALL ON TABLE "public"."store_favorite_users" TO "authenticated";
GRANT ALL ON TABLE "public"."store_favorite_users" TO "service_role";



GRANT ALL ON TABLE "public"."store_images" TO "anon";
GRANT ALL ON TABLE "public"."store_images" TO "authenticated";
GRANT ALL ON TABLE "public"."store_images" TO "service_role";



GRANT ALL ON TABLE "public"."store_messages" TO "anon";
GRANT ALL ON TABLE "public"."store_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."store_messages" TO "service_role";



GRANT ALL ON TABLE "public"."store_owner_notes" TO "anon";
GRANT ALL ON TABLE "public"."store_owner_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."store_owner_notes" TO "service_role";



GRANT ALL ON TABLE "public"."store_view_tracking" TO "anon";
GRANT ALL ON TABLE "public"."store_view_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."store_view_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."user_store_message_reads" TO "anon";
GRANT ALL ON TABLE "public"."user_store_message_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."user_store_message_reads" TO "service_role";



GRANT ALL ON TABLE "public"."v_store_station_summary" TO "anon";
GRANT ALL ON TABLE "public"."v_store_station_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."v_store_station_summary" TO "service_role";



GRANT ALL ON TABLE "public"."v_store_statistics" TO "anon";
GRANT ALL ON TABLE "public"."v_store_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."v_store_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."visited_stores" TO "anon";
GRANT ALL ON TABLE "public"."visited_stores" TO "authenticated";
GRANT ALL ON TABLE "public"."visited_stores" TO "service_role";



GRANT ALL ON TABLE "public"."visited_stores_stats" TO "anon";
GRANT ALL ON TABLE "public"."visited_stores_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."visited_stores_stats" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
