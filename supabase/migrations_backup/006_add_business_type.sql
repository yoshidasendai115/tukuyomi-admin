-- ================================================
-- Business Type Field Addition
-- 業態選択フィールドの追加
-- ================================================

-- admin_store_edit_requests テーブルに業態フィールドを追加
ALTER TABLE admin_store_edit_requests
ADD COLUMN IF NOT EXISTS business_type text CHECK (business_type IN ('girls_bar', 'snack', 'concept_cafe', 'other')) DEFAULT 'other';

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_business_type ON admin_store_edit_requests(business_type);

-- 既存データの更新（デフォルトで 'other' を設定）
UPDATE admin_store_edit_requests
SET business_type = 'other'
WHERE business_type IS NULL;