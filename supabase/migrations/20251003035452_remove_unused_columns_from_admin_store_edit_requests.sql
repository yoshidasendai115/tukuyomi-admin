-- トークンベースの認証から移行したため、不要なカラムを削除

-- token カラムを削除（トークンベース認証は廃止）
ALTER TABLE admin_store_edit_requests
DROP COLUMN IF EXISTS token;

-- generated_url カラムを削除（トークンURLは使用していない）
ALTER TABLE admin_store_edit_requests
DROP COLUMN IF EXISTS generated_url;

-- business_license カラムを削除（business_license_imageと重複）
ALTER TABLE admin_store_edit_requests
DROP COLUMN IF EXISTS business_license;

COMMENT ON TABLE admin_store_edit_requests IS '店舗編集権限申請（ロールベースアクセス制御に移行済み）';
