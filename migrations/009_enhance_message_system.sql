-- ================================================
-- メッセージングシステムの拡張
-- お気に入り登録ユーザーへの一斉送信機能
-- ================================================

-- 1. message_threadsテーブルの修正
-- thread_typeカラムを追加してメッセージの種類を区別
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'message_threads'
        AND column_name = 'thread_type'
    ) THEN
        ALTER TABLE message_threads
        ADD COLUMN thread_type text DEFAULT 'application'
        CHECK (thread_type IN ('application', 'broadcast', 'direct'));

        -- コメント追加
        COMMENT ON COLUMN message_threads.thread_type IS 'スレッドの種類: application=求人応募, broadcast=一斉送信, direct=1対1';
    END IF;
END $$;

-- application_idをNULL許容に変更
ALTER TABLE message_threads
ALTER COLUMN application_id DROP NOT NULL;

-- 2. 店舗からの一斉送信メッセージテーブル
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'notification' CHECK (message_type IN ('notification', 'campaign', 'news', 'other')),
    target_audience text DEFAULT 'favorites' CHECK (target_audience IN ('all', 'favorites', 'applicants')),
    is_active boolean DEFAULT true,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. 一斉送信メッセージの受信者管理テーブル
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id uuid NOT NULL REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    thread_id uuid REFERENCES message_threads(id) ON DELETE CASCADE,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. メッセージテンプレートテーブル（将来的な拡張用）
CREATE TABLE IF NOT EXISTS message_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'notification',
    variables jsonb, -- {key: description}形式でテンプレート変数を保存
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_message_threads_thread_type ON message_threads(thread_type);
CREATE INDEX IF NOT EXISTS idx_message_threads_store_id ON message_threads(store_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_store_id ON broadcast_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_sent_at ON broadcast_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_id ON broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_is_read ON broadcast_recipients(is_read);
CREATE INDEX IF NOT EXISTS idx_message_templates_store_id ON message_templates(store_id);

-- 5. お気に入り登録ユーザーへのメッセージ送信用のビュー
CREATE OR REPLACE VIEW store_favorite_users AS
SELECT
    fs.store_id,
    fs.user_id,
    fs.created_at as favorited_at,
    u.email,
    u.raw_user_meta_data->>'name' as user_name
FROM favorite_stores fs
LEFT JOIN auth.users u ON fs.user_id = u.id
WHERE u.deleted_at IS NULL;

-- 6. メッセージ送信統計用のビュー
CREATE OR REPLACE VIEW broadcast_statistics AS
SELECT
    bm.id as broadcast_id,
    bm.store_id,
    bm.title,
    bm.sent_at,
    COUNT(br.id) as total_recipients,
    COUNT(CASE WHEN br.is_read = true THEN 1 END) as read_count,
    COUNT(CASE WHEN br.is_deleted = true THEN 1 END) as deleted_count,
    ROUND(
        CASE
            WHEN COUNT(br.id) > 0
            THEN (COUNT(CASE WHEN br.is_read = true THEN 1 END)::numeric / COUNT(br.id)::numeric * 100)
            ELSE 0
        END, 2
    ) as read_rate
FROM broadcast_messages bm
LEFT JOIN broadcast_recipients br ON bm.id = br.broadcast_id
GROUP BY bm.id, bm.store_id, bm.title, bm.sent_at;

-- 7. メッセージ送信履歴の取得関数
CREATE OR REPLACE FUNCTION get_store_broadcast_history(
    p_store_id uuid,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
) RETURNS TABLE (
    broadcast_id uuid,
    title text,
    content text,
    message_type text,
    sent_at timestamp with time zone,
    total_recipients integer,
    read_count integer,
    read_rate numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bs.broadcast_id,
        bm.title,
        bm.content,
        bm.message_type,
        bm.sent_at,
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
$$ LANGUAGE plpgsql;

-- 8. お気に入り登録ユーザーへのメッセージ送信関数
CREATE OR REPLACE FUNCTION send_broadcast_to_favorites(
    p_store_id uuid,
    p_title text,
    p_content text,
    p_message_type text DEFAULT 'notification'
) RETURNS json AS $$
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
$$ LANGUAGE plpgsql;

-- 9. メッセージスレッドのユニーク制約を追加（store_idとuser_idの組み合わせ）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'message_threads_store_user_unique'
    ) THEN
        ALTER TABLE message_threads
        ADD CONSTRAINT message_threads_store_user_unique
        UNIQUE (store_id, user_id);
    END IF;
END $$;

-- コメント
COMMENT ON TABLE broadcast_messages IS '店舗からの一斉送信メッセージ';
COMMENT ON TABLE broadcast_recipients IS '一斉送信メッセージの受信者管理';
COMMENT ON TABLE message_templates IS 'メッセージテンプレート';
COMMENT ON VIEW store_favorite_users IS '店舗のお気に入り登録ユーザー一覧';
COMMENT ON VIEW broadcast_statistics IS 'メッセージ送信統計';