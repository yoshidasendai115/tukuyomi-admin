-- ================================================
-- メッセージ取り消し機能の追加
-- ================================================

-- 1. broadcast_messagesテーブルに取り消し関連カラムを追加
DO $$
BEGIN
    -- is_cancelledカラムを追加
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'broadcast_messages'
        AND column_name = 'is_cancelled'
    ) THEN
        ALTER TABLE broadcast_messages
        ADD COLUMN is_cancelled boolean DEFAULT false;

        COMMENT ON COLUMN broadcast_messages.is_cancelled IS 'メッセージが取り消されたかどうか';
    END IF;

    -- cancelled_atカラムを追加
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'broadcast_messages'
        AND column_name = 'cancelled_at'
    ) THEN
        ALTER TABLE broadcast_messages
        ADD COLUMN cancelled_at timestamp with time zone;

        COMMENT ON COLUMN broadcast_messages.cancelled_at IS 'メッセージ取り消し日時';
    END IF;

    -- cancellation_reasonカラムを追加
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'broadcast_messages'
        AND column_name = 'cancellation_reason'
    ) THEN
        ALTER TABLE broadcast_messages
        ADD COLUMN cancellation_reason text;

        COMMENT ON COLUMN broadcast_messages.cancellation_reason IS '取り消し理由';
    END IF;
END $$;

-- 2. messagesテーブルに取り消し関連カラムを追加
DO $$
BEGIN
    -- is_cancelledカラムを追加
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'messages'
        AND column_name = 'is_cancelled'
    ) THEN
        ALTER TABLE messages
        ADD COLUMN is_cancelled boolean DEFAULT false;

        COMMENT ON COLUMN messages.is_cancelled IS 'メッセージが取り消されたかどうか';
    END IF;
END $$;

-- 3. メッセージ取り消し履歴テーブル
CREATE TABLE IF NOT EXISTS message_cancellations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id uuid REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    cancelled_by text, -- 取り消し実行者（トークンIDなど）
    reason text,
    total_recipients integer,
    read_count integer, -- 取り消し時点での既読数
    unread_count integer, -- 取り消し時点での未読数
    cancelled_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_is_cancelled ON broadcast_messages(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_message_cancellations_broadcast_id ON message_cancellations(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_message_cancellations_store_id ON message_cancellations(store_id);
CREATE INDEX IF NOT EXISTS idx_message_cancellations_cancelled_at ON message_cancellations(cancelled_at DESC);

-- 4. メッセージ取り消し関数
CREATE OR REPLACE FUNCTION cancel_broadcast_message(
    p_broadcast_id uuid,
    p_token text,
    p_reason text DEFAULT NULL
) RETURNS json AS $$
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

    -- 関連するmessagesを更新
    UPDATE messages
    SET is_cancelled = true
    WHERE thread_id IN (
        SELECT thread_id
        FROM broadcast_recipients
        WHERE broadcast_id = p_broadcast_id
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
$$ LANGUAGE plpgsql;

-- 5. メッセージ送信統計ビューを更新（取り消しステータスを含める）
CREATE OR REPLACE VIEW broadcast_statistics AS
SELECT
    bm.id as broadcast_id,
    bm.store_id,
    bm.title,
    bm.sent_at,
    bm.is_cancelled,
    bm.cancelled_at,
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
GROUP BY bm.id, bm.store_id, bm.title, bm.sent_at, bm.is_cancelled, bm.cancelled_at;

-- 6. 送信履歴取得関数を更新（取り消しステータスを含める）
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
    is_cancelled boolean,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
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
        bm.is_cancelled,
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
$$ LANGUAGE plpgsql;

-- コメント
COMMENT ON TABLE message_cancellations IS 'メッセージ取り消し履歴';
COMMENT ON FUNCTION cancel_broadcast_message IS '一斉送信メッセージを取り消す';