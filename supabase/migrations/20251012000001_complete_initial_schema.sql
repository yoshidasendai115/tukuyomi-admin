

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


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






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
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."authenticate_admin"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") IS '管理者認証を行う関数';



CREATE OR REPLACE FUNCTION "public"."authenticate_store"("p_login_id" "text", "p_password" "text", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_store record;
    v_hashed_password text;
    v_failed_attempts integer;
    v_locked_until timestamp with time zone;
    v_max_attempts integer := 5;
    v_lock_duration interval := '30 minutes';
BEGIN
    -- ログインIDで店舗を検索（stores テーブルから）
    SELECT * INTO v_store
    FROM stores
    WHERE login_id = p_login_id;

    -- ユーザーが見つからない
    IF v_store IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'ログインIDまたはパスワードが正しくありません'
        );
    END IF;

    -- パスワードハッシュを計算（MD5）
    v_hashed_password := md5(p_password);

    -- パスワードが一致しない
    IF v_store.password_hash != v_hashed_password THEN
        RETURN json_build_object(
            'success', false,
            'message', 'ログインIDまたはパスワードが正しくありません'
        );
    END IF;

    -- アクセスログを記録
    IF p_ip_address IS NOT NULL THEN
        INSERT INTO store_access_logs (
            store_id,
            ip_address,
            action,
            success
        ) VALUES (
            v_store.id,
            p_ip_address,
            'login',
            true
        );
    END IF;

    -- 認証成功
    RETURN json_build_object(
        'success', true,
        'store_id', v_store.id,
        'store_name', v_store.name
    );
END;
$$;


ALTER FUNCTION "public"."authenticate_store"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") OWNER TO "postgres";


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
    SELECT * INTO v_broadcast
    FROM broadcast_messages
    WHERE id = p_broadcast_id;

    IF v_broadcast IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'メッセージが見つかりません'
        );
    END IF;

    IF v_broadcast.is_cancelled THEN
        RETURN json_build_object(
            'success', false,
            'error', 'このメッセージは既に取り消されています'
        );
    END IF;

    v_store_id := v_broadcast.store_id;

    IF v_broadcast.sent_at IS NOT NULL AND
       v_broadcast.sent_at < (now() - interval '24 hours') THEN
        RETURN json_build_object(
            'success', false,
            'error', '送信から24時間以上経過したメッセージは取り消せません'
        );
    END IF;

    SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
    INTO v_total_recipients, v_read_count, v_unread_count
    FROM broadcast_recipients
    WHERE broadcast_id = p_broadcast_id;

    UPDATE broadcast_messages
    SET
        is_cancelled = true,
        cancelled_at = now(),
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_broadcast_id;

    UPDATE messages
    SET is_cancelled = true
    WHERE id IN (
        SELECT m.id
        FROM messages m
        JOIN message_threads mt ON m.thread_id = mt.id
        JOIN broadcast_recipients br ON br.thread_id = mt.id
        WHERE br.broadcast_id = p_broadcast_id
        AND m.content = v_broadcast.content
    );

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
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE reviews
    SET helpful_count = GREATEST(COALESCE(helpful_count, 0) - 1, 0)
    WHERE id = review_id_param;
END;
$$;


ALTER FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."decrement_helpful_count"("review_id_param" "uuid") IS 'Decrement helpful_count for a review (bypasses RLS with SECURITY DEFINER)';



CREATE OR REPLACE FUNCTION "public"."find_matching_store"("p_store_name" "text", "p_store_address" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_store_id uuid;
BEGIN
    -- 店舗名と住所で完全一致する店舗を検索
    SELECT id INTO v_store_id
    FROM stores
    WHERE name = p_store_name
      AND address = p_store_address
    LIMIT 1;

    -- 完全一致がない場合は、店舗名の部分一致で検索
    IF v_store_id IS NULL THEN
        SELECT id INTO v_store_id
        FROM stores
        WHERE name ILIKE '%' || p_store_name || '%'
           OR p_store_name ILIKE '%' || name || '%'
        ORDER BY 
            CASE 
                WHEN name = p_store_name THEN 1
                WHEN name ILIKE p_store_name || '%' THEN 2
                WHEN name ILIKE '%' || p_store_name THEN 3
                ELSE 4
            END
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
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE reviews
    SET helpful_count = COALESCE(helpful_count, 0) + 1
    WHERE id = review_id_param;
END;
$$;


ALTER FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_helpful_count"("review_id_param" "uuid") IS 'Increment helpful_count for a review (bypasses RLS with SECURITY DEFINER)';



CREATE OR REPLACE FUNCTION "public"."send_broadcast_to_favorites"("p_store_id" "uuid", "p_title" "text", "p_content" "text", "p_message_type" "text" DEFAULT 'notification'::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_recipient_count integer;
    v_user record;
    v_thread_id uuid;
    v_sent_at timestamp with time zone;
    v_broadcast_group_id uuid;
    v_broadcast_message_id uuid;
BEGIN
    v_recipient_count := 0;
    v_sent_at := now();
    v_broadcast_group_id := gen_random_uuid();

    -- broadcast_messagesテーブルにメッセージ本体を1レコード挿入
    INSERT INTO broadcast_messages (
        store_id,
        title,
        content,
        message_type,
        broadcast_group_id,
        created_at
    ) VALUES (
        p_store_id,
        p_title,
        p_content,
        p_message_type,
        v_broadcast_group_id,
        v_sent_at
    ) RETURNING id INTO v_broadcast_message_id;

    -- お気に入りユーザーのmessage_threadsに関連を設定
    FOR v_user IN
        SELECT user_id
        FROM favorite_stores
        WHERE store_id = p_store_id
    LOOP
        -- ブロードキャストメッセージごとに新しいスレッドを作成
        INSERT INTO message_threads (
            store_id,
            user_id,
            thread_type,
            broadcast_message_id,
            is_read,
            updated_at
        ) VALUES (
            p_store_id,
            v_user.user_id,
            'broadcast',
            v_broadcast_message_id,
            false,
            v_sent_at
        );

        v_recipient_count := v_recipient_count + 1;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'recipient_count', v_recipient_count,
        'sent_at', v_sent_at,
        'broadcast_group_id', v_broadcast_group_id,
        'broadcast_message_id', v_broadcast_message_id
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
    "created_at" timestamp with time zone DEFAULT "now"(),
    "store_id" "uuid",
    "user_agent" "text",
    "session_id" "text",
    "country" "text"
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
    "assigned_store_id" "uuid",
    "is_active" boolean DEFAULT true,
    "failed_attempts" integer DEFAULT 0,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "admin_auth_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'moderator'::"text", 'store_owner'::"text"])))
);


ALTER TABLE "public"."admin_auth_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_auth_users" IS '管理者認証テーブル（ロールベースアクセス制御）';



COMMENT ON COLUMN "public"."admin_auth_users"."id" IS '管理者ユーザーID（主キー）';



COMMENT ON COLUMN "public"."admin_auth_users"."login_id" IS 'ログインID（ユニーク）';



COMMENT ON COLUMN "public"."admin_auth_users"."password_hash" IS 'パスワードハッシュ（bcrypt）';



COMMENT ON COLUMN "public"."admin_auth_users"."display_name" IS '表示名';



COMMENT ON COLUMN "public"."admin_auth_users"."email" IS 'メールアドレス';



COMMENT ON COLUMN "public"."admin_auth_users"."role" IS '権限ロール（super_admin/admin/moderator/store_owner）';



COMMENT ON COLUMN "public"."admin_auth_users"."permissions" IS '詳細権限設定（JSON）';



COMMENT ON COLUMN "public"."admin_auth_users"."assigned_store_id" IS '担当店舗ID（store_ownerの場合）';



COMMENT ON COLUMN "public"."admin_auth_users"."is_active" IS 'アクティブ状態';



COMMENT ON COLUMN "public"."admin_auth_users"."failed_attempts" IS 'ログイン失敗回数';



COMMENT ON COLUMN "public"."admin_auth_users"."locked_until" IS 'アカウントロック解除日時';



COMMENT ON COLUMN "public"."admin_auth_users"."last_login_at" IS '最終ログイン日時';



COMMENT ON COLUMN "public"."admin_auth_users"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."admin_auth_users"."updated_at" IS '更新日時';



CREATE TABLE IF NOT EXISTS "public"."admin_store_edit_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "store_name" "text" NOT NULL,
    "store_address" "text" NOT NULL,
    "store_phone" "text" NOT NULL,
    "genre_id" "uuid",
    "applicant_name" "text" NOT NULL,
    "applicant_email" "text" NOT NULL,
    "applicant_phone" "text" NOT NULL,
    "applicant_role" "text" NOT NULL,
    "applicant_relationship" "text",
    "document_type" "text",
    "business_license_image" "text",
    "license_holder_name" "text",
    "identity_document_image" "text",
    "additional_document_type" "text",
    "additional_document_image" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "document_verification_status" "text" DEFAULT 'pending'::"text",
    "admin_notes" "text",
    "verification_notes" "text",
    "rejection_reason" "text",
    "processed_by" "uuid",
    "processed_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "generated_password" "text",
    "additional_info" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_store_edit_requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."admin_store_edit_requests" IS '店舗編集リクエストテーブル（管理者審査用）';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."id" IS 'リクエストID（主キー）';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."store_id" IS '店舗ID（承認後に設定）';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."store_name" IS '店舗名';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."store_address" IS '店舗住所';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."store_phone" IS '店舗電話番号';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."genre_id" IS 'ジャンルID';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."applicant_name" IS '申請者名';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."applicant_email" IS '申請者メールアドレス';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."applicant_phone" IS '申請者電話番号';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."applicant_role" IS '申請者の役職';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."applicant_relationship" IS '営業許可証名義人との続柄';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."document_type" IS '書類種別';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."business_license_image" IS '営業許可証画像URL';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."license_holder_name" IS '営業許可証名義人';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."identity_document_image" IS '身分証明書画像URL';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."additional_document_type" IS '追加書類種別';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."additional_document_image" IS '追加書類画像URL';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."status" IS '審査ステータス（pending/approved/rejected）';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."document_verification_status" IS '書類確認ステータス（pending/verified/rejected）';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."admin_notes" IS '管理者メモ';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."verification_notes" IS '書類確認メモ';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."rejection_reason" IS '却下理由';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."processed_by" IS '処理担当管理者ID';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."processed_at" IS '処理日時';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."reviewed_at" IS 'レビュー日時';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."generated_password" IS '生成されたパスワード（承認時）';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."additional_info" IS '追加情報';



COMMENT ON COLUMN "public"."admin_store_edit_requests"."created_at" IS '作成日時';



CREATE TABLE IF NOT EXISTS "public"."broadcast_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'notification'::"text",
    "broadcast_group_id" "uuid" NOT NULL,
    "is_cancelled" boolean DEFAULT false,
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."broadcast_messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."broadcast_messages" IS 'お気に入りユーザーへの一斉配信メッセージ（メッセージ本体）';



COMMENT ON COLUMN "public"."broadcast_messages"."broadcast_group_id" IS '配信を一意に識別するID';



COMMENT ON COLUMN "public"."broadcast_messages"."is_cancelled" IS 'メッセージが取り消されたかどうか';



CREATE TABLE IF NOT EXISTS "public"."cast_profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "height" integer,
    "body_type" character varying(50),
    "work_experience" "text"
);


ALTER TABLE "public"."cast_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."cast_profiles" IS 'キャストユーザー固有のプロフィール情報（共通項目はprofilesで管理）';



CREATE TABLE IF NOT EXISTS "public"."favorite_stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "store_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_comment" "text"
);


ALTER TABLE "public"."favorite_stores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."favorite_stores"."user_comment" IS 'ユーザーが店舗に対して追加した個人的なメモ・コメント（最大500文字推奨）';



CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "store_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."genres" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_visible" boolean DEFAULT true,
    "icon" "text" DEFAULT '🍸'::"text",
    "description" "text",
    "slug" "text"
);


ALTER TABLE "public"."genres" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guest_profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."guest_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."guest_profiles" IS 'ゲストユーザー固有のプロフィール情報（共通項目はprofilesで管理）';



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
    "message_id" "uuid",
    "store_id" "uuid",
    "cancelled_by" "uuid",
    "reason" "text",
    "cancelled_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_cancellations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid",
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "category" "text",
    "is_active" boolean DEFAULT true,
    "use_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_threads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "store_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "thread_type" "text" DEFAULT 'broadcast'::"text",
    "broadcast_message_id" "uuid",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    CONSTRAINT "message_threads_thread_type_check" CHECK (("thread_type" = 'broadcast'::"text"))
);


ALTER TABLE "public"."message_threads" OWNER TO "postgres";


COMMENT ON COLUMN "public"."message_threads"."broadcast_message_id" IS 'broadcast配信の場合のメッセージ本体へのID参照';



COMMENT ON COLUMN "public"."message_threads"."is_read" IS 'broadcastメッセージの既読状態';



COMMENT ON COLUMN "public"."message_threads"."read_at" IS 'broadcastメッセージを既読にした日時';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "thread_id" "uuid",
    "sender_type" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "is_cancelled" boolean DEFAULT false,
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "broadcast_group_id" "uuid",
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['user'::"text", 'store'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


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
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY (ARRAY[('message'::character varying)::"text", ('application'::character varying)::"text", ('system'::character varying)::"text", ('campaign'::character varying)::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."read" IS 'Deprecated - use notification_reads table instead for per-user read status';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "nickname" "text",
    "birth_date" "date",
    "gender" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_type" character varying(50) DEFAULT 'guest'::character varying,
    "is_complete" boolean DEFAULT false,
    "avatar_id" character varying(50),
    "nearest_station_id" "uuid",
    CONSTRAINT "profiles_gender_check" CHECK (("gender" = ANY (ARRAY['男性'::"text", '女性'::"text", 'その他'::"text", '回答しない'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'ユーザー共通プロフィール情報（ゲスト・キャスト共通）';



COMMENT ON COLUMN "public"."profiles"."nickname" IS '表示名（ゲスト・キャスト共通）';



COMMENT ON COLUMN "public"."profiles"."birth_date" IS '生年月日（ゲスト・キャスト共通）';



COMMENT ON COLUMN "public"."profiles"."gender" IS '性別（ゲスト・キャスト共通）';



COMMENT ON COLUMN "public"."profiles"."avatar_id" IS 'アバターID（ゲスト・キャスト共通）';



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
    "request_type" character varying(20) DEFAULT 'report'::character varying,
    CONSTRAINT "review_reports_reason_check" CHECK ((("reason")::"text" = ANY ((ARRAY['spam'::character varying, 'inappropriate'::character varying, 'harassment'::character varying, 'false'::character varying, 'privacy'::character varying, 'other'::character varying, 'self_deletion'::character varying])::"text"[]))),
    CONSTRAINT "review_reports_request_type_check" CHECK ((("request_type")::"text" = ANY ((ARRAY['self_deletion'::character varying, 'report'::character varying])::"text"[]))),
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
    "guest_ratings" "jsonb",
    "helpful_count" integer DEFAULT 0,
    "images" "text"[],
    "reviewer_type" character varying(20) DEFAULT 'guest'::character varying,
    "work_status" "text",
    "reviewer_nickname" "text",
    "reviewer_avatar_icon" character varying(50),
    "is_deleted_account" boolean DEFAULT false,
    "cast_ratings" "jsonb",
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "deletion_reason" "text",
    CONSTRAINT "reviews_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reviews"."cast_ratings" IS 'キャスト評価（働いているキャストによる店舗評価）';



COMMENT ON COLUMN "public"."reviews"."is_deleted" IS '削除済みフラグ';



COMMENT ON COLUMN "public"."reviews"."deleted_at" IS '削除日時';



COMMENT ON COLUMN "public"."reviews"."deleted_by" IS '削除した管理者ID';



COMMENT ON COLUMN "public"."reviews"."deletion_reason" IS '削除理由';



CREATE TABLE IF NOT EXISTS "public"."station_group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "station_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "walking_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."station_group_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."station_group_members" IS '駅グループメンバー（駅グループに所属する駅のリスト）';



COMMENT ON COLUMN "public"."station_group_members"."id" IS '駅グループメンバーID';



COMMENT ON COLUMN "public"."station_group_members"."group_id" IS '駅グループID（station_groupsへの参照）';



COMMENT ON COLUMN "public"."station_group_members"."station_id" IS '駅ID（stationsへの参照）';



COMMENT ON COLUMN "public"."station_group_members"."is_primary" IS '主要駅フラグ';



COMMENT ON COLUMN "public"."station_group_members"."walking_minutes" IS '徒歩時間（分）';



COMMENT ON COLUMN "public"."station_group_members"."created_at" IS '作成日時';



CREATE TABLE IF NOT EXISTS "public"."station_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "is_major_terminal" boolean DEFAULT false,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "display_order" integer DEFAULT 0
);


ALTER TABLE "public"."station_groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."station_groups" IS '駅グループマスタ（エリア区分として使用）';



COMMENT ON COLUMN "public"."station_groups"."id" IS '駅グループID';



COMMENT ON COLUMN "public"."station_groups"."name" IS '駅グループ名（内部用）';



COMMENT ON COLUMN "public"."station_groups"."display_name" IS '表示名';



COMMENT ON COLUMN "public"."station_groups"."is_major_terminal" IS '主要ターミナル駅フラグ';



COMMENT ON COLUMN "public"."station_groups"."description" IS '説明';



COMMENT ON COLUMN "public"."station_groups"."created_at" IS '作成日時';



COMMENT ON COLUMN "public"."station_groups"."display_order" IS '表示順序';



CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "index_letter" character varying,
    "latitude" numeric,
    "longitude" numeric,
    "is_within_tokyo23" boolean DEFAULT true,
    "railway_lines" "text"[] DEFAULT '{}'::"text"[],
    "line_orders" "jsonb" DEFAULT '{}'::"jsonb",
    "is_major" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stations" OWNER TO "postgres";


COMMENT ON TABLE "public"."stations" IS '駅マスタ（旧areasテーブル）';



COMMENT ON COLUMN "public"."stations"."id" IS '駅ID';



COMMENT ON COLUMN "public"."stations"."name" IS '駅名';



COMMENT ON COLUMN "public"."stations"."index_letter" IS 'インデックス文字（50音順）';



COMMENT ON COLUMN "public"."stations"."latitude" IS '緯度';



COMMENT ON COLUMN "public"."stations"."longitude" IS '経度';



COMMENT ON COLUMN "public"."stations"."is_within_tokyo23" IS '東京23区内フラグ';



COMMENT ON COLUMN "public"."stations"."railway_lines" IS '路線名リスト';



COMMENT ON COLUMN "public"."stations"."line_orders" IS '路線順序情報（JSON）';



COMMENT ON COLUMN "public"."stations"."is_major" IS '主要駅フラグ';



COMMENT ON COLUMN "public"."stations"."display_order" IS '表示順序';



COMMENT ON COLUMN "public"."stations"."created_at" IS '作成日時';



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


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "station_id" "uuid",
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
    "has_cocktail_icon" boolean DEFAULT false,
    "latitude" numeric(10,7),
    "longitude" numeric(10,7),
    "price_level" "text",
    "website" "text",
    "rating" numeric(2,1),
    "review_count" integer DEFAULT 0,
    "features" "text"[],
    "opening_hours_text" "text"[],
    "tags" "text"[],
    "view_count" integer DEFAULT 0,
    "owner_id" "uuid",
    "email" "text",
    "secondary_phone" "text",
    "fax_number" "text",
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
    "penalty_system" "text",
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
    "priority_score" integer DEFAULT 0,
    "recommendation_reason" "text",
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
    "recommended_at" timestamp with time zone,
    "recommended_by" "uuid",
    "sync_priority" integer DEFAULT 0,
    "calculated_rating" numeric(3,2) DEFAULT 0,
    "calculated_review_count" integer DEFAULT 0,
    "area_id" "uuid",
    "catch_copy" "text",
    "seating_capacity" "text",
    "payment_methods" "text",
    CONSTRAINT "stores_plan_type_check" CHECK (("plan_type" = ANY (ARRAY['free'::"text", 'basic'::"text", 'premium'::"text", 'enterprise'::"text"]))),
    CONSTRAINT "stores_priority_score_check" CHECK (("priority_score" = ANY (ARRAY[0, 3, 5]))),
    CONSTRAINT "stores_recruitment_status_check" CHECK (("recruitment_status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


COMMENT ON TABLE "public"."stores" IS 'おすすめ判定はpriority_scoreで自動判定（3または5の場合におすすめ）';



COMMENT ON COLUMN "public"."stores"."station_id" IS 'エリアID（areasテーブルへの参照）';



COMMENT ON COLUMN "public"."stores"."genre_id" IS '業態ID（genresテーブルへの参照）';



COMMENT ON COLUMN "public"."stores"."recruitment_status" IS '募集状態: active=募集中, paused=一時停止, closed=募集終了';



COMMENT ON COLUMN "public"."stores"."plan_type" IS 'プランタイプ: free=無料（画像3枚）, basic=ベーシック, premium=プレミアム, enterprise=エンタープライズ';



COMMENT ON COLUMN "public"."stores"."custom_notes" IS '店舗オーナーが自由に記入できるメモ・お知らせ欄';



COMMENT ON COLUMN "public"."stores"."image_url" IS 'Main store image URL';



COMMENT ON COLUMN "public"."stores"."additional_images" IS 'Array of additional store image URLs (up to 3)';



COMMENT ON COLUMN "public"."stores"."accessible_stations" IS '複数駅からのアクセス情報を保持するJSON配列';



COMMENT ON COLUMN "public"."stores"."priority_score" IS '優先表示プラン (0:Free無料, 3:Standard月980円, 5:Premium月1,980円)';



COMMENT ON COLUMN "public"."stores"."recommendation_reason" IS 'おすすめ理由';



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



COMMENT ON COLUMN "public"."stores"."recommended_at" IS 'おすすめ設定日時';



COMMENT ON COLUMN "public"."stores"."recommended_by" IS '設定した管理者のID';



COMMENT ON COLUMN "public"."stores"."calculated_rating" IS 'Average rating calculated from system reviews';



COMMENT ON COLUMN "public"."stores"."calculated_review_count" IS 'Count of reviews from this system';



COMMENT ON COLUMN "public"."stores"."area_id" IS 'エリアID（station_groupsテーブルへの参照）';



COMMENT ON COLUMN "public"."stores"."catch_copy" IS '店舗のキャッチコピー';



COMMENT ON COLUMN "public"."stores"."seating_capacity" IS '座席数';



COMMENT ON COLUMN "public"."stores"."payment_methods" IS '支払い方法';



CREATE OR REPLACE VIEW "public"."store_ratings" AS
 SELECT "s"."id",
    "s"."name",
    COALESCE(("avg"("r"."rating"))::numeric(3,2), (0)::numeric) AS "calculated_rating",
    ("count"("r"."id"))::integer AS "calculated_review_count",
    COALESCE(("avg"(
        CASE
            WHEN (("r"."reviewer_type")::"text" = 'guest'::"text") THEN "r"."rating"
            ELSE NULL::integer
        END))::numeric(3,2), (0)::numeric) AS "guest_rating",
    ("count"(
        CASE
            WHEN (("r"."reviewer_type")::"text" = 'guest'::"text") THEN 1
            ELSE NULL::integer
        END))::integer AS "guest_review_count",
    COALESCE(("avg"(
        CASE
            WHEN (("r"."reviewer_type")::"text" = 'cast'::"text") THEN "r"."rating"
            ELSE NULL::integer
        END))::numeric(3,2), (0)::numeric) AS "cast_rating",
    ("count"(
        CASE
            WHEN (("r"."reviewer_type")::"text" = 'cast'::"text") THEN 1
            ELSE NULL::integer
        END))::integer AS "cast_review_count"
   FROM ("public"."stores" "s"
     LEFT JOIN "public"."reviews" "r" ON ((("s"."id" = "r"."store_id") AND ("r"."is_verified" = true) AND ("r"."is_deleted_account" = false))))
  GROUP BY "s"."id", "s"."name";


ALTER VIEW "public"."store_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_view_tracking" (
    "store_id" "uuid" NOT NULL,
    "ip_hash" "text" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_view_tracking" OWNER TO "postgres";


COMMENT ON TABLE "public"."store_view_tracking" IS 'Tracks store page views to prevent duplicate counting within 1 hour';



COMMENT ON COLUMN "public"."store_view_tracking"."ip_hash" IS 'SHA256 hash of IP address for privacy protection';



CREATE TABLE IF NOT EXISTS "public"."user_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message_id" "uuid",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "is_starred" boolean DEFAULT false,
    "is_archived" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_store_message_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_store_message_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text",
    "phone" "text",
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."v_store_station_summary" AS
 SELECT "s"."id",
    "s"."name" AS "store_name",
    "s"."google_place_id",
    "s"."station" AS "primary_station",
    "s"."station_distance" AS "primary_distance",
    "st"."name" AS "station_name",
    "jsonb_array_length"(COALESCE("s"."accessible_stations", '[]'::"jsonb")) AS "accessible_station_count",
    "s"."created_at",
    "s"."updated_at"
   FROM ("public"."stores" "s"
     LEFT JOIN "public"."stations" "st" ON (("s"."station_id" = "st"."id")))
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
    ADD CONSTRAINT "admin_auth_users_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."broadcast_messages"
    ADD CONSTRAINT "broadcast_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cast_profiles"
    ADD CONSTRAINT "cast_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_stores"
    ADD CONSTRAINT "favorite_stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."favorite_stores"
    ADD CONSTRAINT "favorite_stores_user_id_store_id_key" UNIQUE ("user_id", "store_id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."genres"
    ADD CONSTRAINT "genres_slug_key" UNIQUE ("slug");



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



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_reads"
    ADD CONSTRAINT "notification_reads_user_id_notification_id_key" UNIQUE ("user_id", "notification_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_nickname_unique" UNIQUE ("nickname");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_key" UNIQUE ("user_id");



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
    ADD CONSTRAINT "station_group_members_group_id_area_id_key" UNIQUE ("group_id", "station_id");



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."station_groups"
    ADD CONSTRAINT "station_groups_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."station_groups"
    ADD CONSTRAINT "station_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_messages"
    ADD CONSTRAINT "user_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_store_message_reads"
    ADD CONSTRAINT "user_store_message_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_store_message_reads"
    ADD CONSTRAINT "user_store_message_reads_user_id_message_id_key" UNIQUE ("user_id", "message_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visited_stores"
    ADD CONSTRAINT "visited_stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visited_stores"
    ADD CONSTRAINT "visited_stores_user_id_store_id_key" UNIQUE ("user_id", "store_id");



CREATE UNIQUE INDEX "admin_auth_users_login_id_key" ON "public"."admin_auth_users" USING "btree" ("login_id");



CREATE INDEX "idx_admin_access_logs_store_id" ON "public"."admin_access_logs" USING "btree" ("store_id");



CREATE INDEX "idx_admin_auth_users_is_active" ON "public"."admin_auth_users" USING "btree" ("is_active");



CREATE INDEX "idx_admin_auth_users_login_id" ON "public"."admin_auth_users" USING "btree" ("login_id");



CREATE INDEX "idx_admin_store_edit_requests_status" ON "public"."admin_store_edit_requests" USING "btree" ("status");



CREATE INDEX "idx_admin_store_edit_requests_store_id" ON "public"."admin_store_edit_requests" USING "btree" ("store_id");



CREATE INDEX "idx_broadcast_messages_broadcast_group_id" ON "public"."broadcast_messages" USING "btree" ("broadcast_group_id");



CREATE INDEX "idx_broadcast_messages_created_at" ON "public"."broadcast_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_broadcast_messages_store_id" ON "public"."broadcast_messages" USING "btree" ("store_id");



CREATE INDEX "idx_favorite_stores_user_id" ON "public"."favorite_stores" USING "btree" ("user_id");



CREATE INDEX "idx_favorites_store_id" ON "public"."favorites" USING "btree" ("store_id");



CREATE INDEX "idx_favorites_user_id" ON "public"."favorites" USING "btree" ("user_id");



CREATE INDEX "idx_jobs_store_id" ON "public"."jobs" USING "btree" ("store_id");



CREATE INDEX "idx_message_cancellations_message_id" ON "public"."message_cancellations" USING "btree" ("message_id");



CREATE INDEX "idx_message_templates_store_id" ON "public"."message_templates" USING "btree" ("store_id");



CREATE INDEX "idx_message_threads_broadcast_message_id" ON "public"."message_threads" USING "btree" ("broadcast_message_id");



CREATE INDEX "idx_message_threads_thread_type" ON "public"."message_threads" USING "btree" ("thread_type");



CREATE INDEX "idx_message_threads_user_thread_type" ON "public"."message_threads" USING "btree" ("user_id", "thread_type");



CREATE INDEX "idx_messages_broadcast_group_id" ON "public"."messages" USING "btree" ("broadcast_group_id");



CREATE INDEX "idx_messages_thread_id" ON "public"."messages" USING "btree" ("thread_id");



CREATE INDEX "idx_notification_reads_notification_id" ON "public"."notification_reads" USING "btree" ("notification_id");



CREATE INDEX "idx_notification_reads_user_id" ON "public"."notification_reads" USING "btree" ("user_id");



CREATE INDEX "idx_notification_reads_user_notification" ON "public"."notification_reads" USING "btree" ("user_id", "notification_id");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_nearest_station_id" ON "public"."profiles" USING "btree" ("nearest_station_id");



CREATE INDEX "idx_profiles_nickname" ON "public"."profiles" USING "btree" ("nickname");



CREATE INDEX "idx_profiles_user_id" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "idx_review_helpfuls_review_id" ON "public"."review_helpfuls" USING "btree" ("review_id");



CREATE INDEX "idx_review_helpfuls_user_id" ON "public"."review_helpfuls" USING "btree" ("user_id");



CREATE INDEX "idx_review_reports_created_at" ON "public"."review_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_review_reports_reporter_id" ON "public"."review_reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_review_reports_request_type" ON "public"."review_reports" USING "btree" ("request_type");



CREATE INDEX "idx_review_reports_review_id" ON "public"."review_reports" USING "btree" ("review_id");



CREATE INDEX "idx_review_reports_status" ON "public"."review_reports" USING "btree" ("status");



CREATE INDEX "idx_reviews_is_deleted" ON "public"."reviews" USING "btree" ("is_deleted");



CREATE INDEX "idx_reviews_is_deleted_account" ON "public"."reviews" USING "btree" ("is_deleted_account");



CREATE INDEX "idx_reviews_reviewer_type" ON "public"."reviews" USING "btree" ("reviewer_type");



CREATE INDEX "idx_reviews_store_id" ON "public"."reviews" USING "btree" ("store_id");



CREATE INDEX "idx_reviews_user_id" ON "public"."reviews" USING "btree" ("user_id");



CREATE INDEX "idx_station_group_members_area_id" ON "public"."station_group_members" USING "btree" ("station_id");



CREATE INDEX "idx_station_group_members_group_id" ON "public"."station_group_members" USING "btree" ("group_id");



CREATE INDEX "idx_station_groups_display_order" ON "public"."station_groups" USING "btree" ("display_order");



CREATE INDEX "idx_stations_coordinates" ON "public"."stations" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_stations_index_letter" ON "public"."stations" USING "btree" ("index_letter");



CREATE INDEX "idx_stations_is_major" ON "public"."stations" USING "btree" ("is_major");



CREATE INDEX "idx_stations_name" ON "public"."stations" USING "btree" ("name");



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



CREATE INDEX "idx_stores_area_id" ON "public"."stores" USING "btree" ("station_id");



CREATE INDEX "idx_stores_area_station" ON "public"."stores" USING "btree" ("station_id", "station") WHERE ("station_id" IS NOT NULL);



CREATE INDEX "idx_stores_genre_id" ON "public"."stores" USING "btree" ("genre_id");



CREATE INDEX "idx_stores_google_place_id" ON "public"."stores" USING "btree" ("google_place_id") WHERE ("google_place_id" IS NOT NULL);



CREATE INDEX "idx_stores_priority_score" ON "public"."stores" USING "btree" ("priority_score");



CREATE INDEX "idx_stores_recommended_at" ON "public"."stores" USING "btree" ("recommended_at");



CREATE INDEX "idx_stores_station" ON "public"."stores" USING "btree" ("station");



CREATE INDEX "idx_stores_station_distance" ON "public"."stores" USING "btree" ("station_distance") WHERE ("station_distance" IS NOT NULL);



CREATE INDEX "idx_user_messages_message_id" ON "public"."user_messages" USING "btree" ("message_id");



CREATE INDEX "idx_user_messages_user_id" ON "public"."user_messages" USING "btree" ("user_id");



CREATE INDEX "idx_user_store_message_reads_message_id" ON "public"."user_store_message_reads" USING "btree" ("message_id");



CREATE INDEX "idx_user_store_message_reads_user_id" ON "public"."user_store_message_reads" USING "btree" ("user_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_visited_stores_store_id" ON "public"."visited_stores" USING "btree" ("store_id");



CREATE INDEX "idx_visited_stores_user_id" ON "public"."visited_stores" USING "btree" ("user_id");



CREATE INDEX "idx_visited_stores_visited_at" ON "public"."visited_stores" USING "btree" ("visited_at" DESC);



CREATE UNIQUE INDEX "message_threads_application_unique" ON "public"."message_threads" USING "btree" ("store_id", "user_id") WHERE ("thread_type" = 'application'::"text");



CREATE UNIQUE INDEX "message_threads_broadcast_unique" ON "public"."message_threads" USING "btree" ("store_id", "user_id", "broadcast_message_id") WHERE (("thread_type" = 'broadcast'::"text") AND ("broadcast_message_id" IS NOT NULL));



CREATE OR REPLACE TRIGGER "cleanup_store_views_trigger" AFTER INSERT ON "public"."store_view_tracking" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_cleanup_views"();



CREATE OR REPLACE TRIGGER "enforce_store_image_limit" BEFORE INSERT ON "public"."store_images" FOR EACH ROW EXECUTE FUNCTION "public"."check_store_image_limit"();



CREATE OR REPLACE TRIGGER "update_store_images_updated_at" BEFORE UPDATE ON "public"."store_images" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stores_updated_at" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_access_logs"
    ADD CONSTRAINT "admin_access_logs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_auth_users"
    ADD CONSTRAINT "admin_auth_users_assigned_store_id_fkey" FOREIGN KEY ("assigned_store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id");



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."admin_auth_users"("id");



ALTER TABLE ONLY "public"."admin_store_edit_requests"
    ADD CONSTRAINT "admin_store_edit_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "public"."broadcast_messages"
    ADD CONSTRAINT "broadcast_messages_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cast_profiles"
    ADD CONSTRAINT "cast_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorite_stores"
    ADD CONSTRAINT "favorite_stores_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guest_profiles"
    ADD CONSTRAINT "guest_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_threads"
    ADD CONSTRAINT "message_threads_broadcast_message_id_fkey" FOREIGN KEY ("broadcast_message_id") REFERENCES "public"."broadcast_messages"("id") ON DELETE CASCADE;



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
    ADD CONSTRAINT "profiles_nearest_station_id_fkey" FOREIGN KEY ("nearest_station_id") REFERENCES "public"."stations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_helpfuls"
    ADD CONSTRAINT "review_helpfuls_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_reported_user_id_fkey" FOREIGN KEY ("reported_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_reports"
    ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."station_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_group_members"
    ADD CONSTRAINT "station_group_members_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id");



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
    ADD CONSTRAINT "stores_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "public"."station_groups"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_recommended_by_fkey" FOREIGN KEY ("recommended_by") REFERENCES "public"."admin_auth_users"("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id");



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



CREATE POLICY "Users can create self deletion requests" ON "public"."review_reports" FOR INSERT WITH CHECK ((("auth"."uid"() = "reporter_id") AND (("request_type")::"text" = 'self_deletion'::"text")));



CREATE POLICY "Users can delete own favorites" ON "public"."favorite_stores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own reviews" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own visited stores" ON "public"."visited_stores" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own cast profile" ON "public"."cast_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own favorites" ON "public"."favorite_stores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own guest profile" ON "public"."guest_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own notification reads" ON "public"."notification_reads" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own reports" ON "public"."review_reports" FOR INSERT WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can insert own visited stores" ON "public"."visited_stores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can manage their own read status" ON "public"."user_store_message_reads" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own notification reads" ON "public"."notification_reads" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own notifications" ON "public"."notifications" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "Users can update own cast profile" ON "public"."cast_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own favorites" ON "public"."favorite_stores" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own guest profile" ON "public"."guest_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own notification reads" ON "public"."notification_reads" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own reviews" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own message thread read status" ON "public"."message_threads" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING ((("auth"."uid"())::"text" = ("user_id")::"text")) WITH CHECK ((("auth"."uid"())::"text" = ("user_id")::"text"));



CREATE POLICY "Users can view own favorites" ON "public"."favorite_stores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own reports" ON "public"."review_reports" FOR SELECT USING (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can view own visited stores" ON "public"."visited_stores" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their self deletion requests" ON "public"."review_reports" FOR SELECT USING ((("auth"."uid"() = "reporter_id") AND (("request_type")::"text" = 'self_deletion'::"text")));



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



GRANT ALL ON FUNCTION "public"."authenticate_store"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."authenticate_store"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."authenticate_store"("p_login_id" "text", "p_password" "text", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_broadcast_message"("p_broadcast_id" "uuid", "p_token" "text", "p_reason" "text") TO "service_role";



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



GRANT ALL ON TABLE "public"."admin_store_edit_requests" TO "anon";
GRANT ALL ON TABLE "public"."admin_store_edit_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_store_edit_requests" TO "service_role";



GRANT ALL ON TABLE "public"."broadcast_messages" TO "anon";
GRANT ALL ON TABLE "public"."broadcast_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."broadcast_messages" TO "service_role";



GRANT ALL ON TABLE "public"."cast_profiles" TO "anon";
GRANT ALL ON TABLE "public"."cast_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."cast_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."favorite_stores" TO "anon";
GRANT ALL ON TABLE "public"."favorite_stores" TO "authenticated";
GRANT ALL ON TABLE "public"."favorite_stores" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "anon";
GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



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



GRANT ALL ON TABLE "public"."stations" TO "anon";
GRANT ALL ON TABLE "public"."stations" TO "authenticated";
GRANT ALL ON TABLE "public"."stations" TO "service_role";



GRANT ALL ON TABLE "public"."store_edit_history" TO "anon";
GRANT ALL ON TABLE "public"."store_edit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."store_edit_history" TO "service_role";



GRANT ALL ON TABLE "public"."store_images" TO "anon";
GRANT ALL ON TABLE "public"."store_images" TO "authenticated";
GRANT ALL ON TABLE "public"."store_images" TO "service_role";



GRANT ALL ON TABLE "public"."store_messages" TO "anon";
GRANT ALL ON TABLE "public"."store_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."store_messages" TO "service_role";



GRANT ALL ON TABLE "public"."store_owner_notes" TO "anon";
GRANT ALL ON TABLE "public"."store_owner_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."store_owner_notes" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."store_ratings" TO "anon";
GRANT ALL ON TABLE "public"."store_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."store_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."store_view_tracking" TO "anon";
GRANT ALL ON TABLE "public"."store_view_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."store_view_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."user_messages" TO "anon";
GRANT ALL ON TABLE "public"."user_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."user_messages" TO "service_role";



GRANT ALL ON TABLE "public"."user_store_message_reads" TO "anon";
GRANT ALL ON TABLE "public"."user_store_message_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."user_store_message_reads" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



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
