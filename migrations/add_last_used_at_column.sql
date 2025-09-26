-- ================================================
-- admin_store_edit_tokensテーブルにlast_used_atカラムを追加
-- ================================================

-- last_used_atカラムが存在しない場合のみ追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'admin_store_edit_tokens'
        AND column_name = 'last_used_at'
    ) THEN
        ALTER TABLE admin_store_edit_tokens
        ADD COLUMN last_used_at timestamp with time zone;

        -- コメント追加
        COMMENT ON COLUMN admin_store_edit_tokens.last_used_at IS '最終使用日時';
    END IF;
END $$;