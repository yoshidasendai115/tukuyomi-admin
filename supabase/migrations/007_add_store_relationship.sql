-- ================================================
-- Store Relationship for Requests
-- 申請と店舗の1対1関係を確立
-- ================================================

-- admin_store_edit_requests テーブルにstore_idフィールドを追加
ALTER TABLE admin_store_edit_requests
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES stores(id) ON DELETE SET NULL;

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_store_id ON admin_store_edit_requests(store_id);

-- 店舗名による自動マッチング用の関数を作成
CREATE OR REPLACE FUNCTION find_matching_store(
    p_store_name text,
    p_store_address text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    v_store_id uuid;
BEGIN
    -- 完全一致検索（店舗名）
    SELECT id INTO v_store_id
    FROM stores
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_store_name))
    LIMIT 1;

    -- 見つからない場合は部分一致検索
    IF v_store_id IS NULL THEN
        SELECT id INTO v_store_id
        FROM stores
        WHERE LOWER(name) LIKE '%' || LOWER(TRIM(p_store_name)) || '%'
        LIMIT 1;
    END IF;

    -- 住所も考慮した検索（より精密）
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
$$ LANGUAGE plpgsql;

-- 既存の申請データに対して自動マッチングを実行
UPDATE admin_store_edit_requests
SET store_id = find_matching_store(store_name, store_address)
WHERE store_id IS NULL;