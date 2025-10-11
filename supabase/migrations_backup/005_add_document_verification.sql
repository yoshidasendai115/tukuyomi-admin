-- ================================================
-- Document Verification System
-- 画像による書類確認システムの追加
-- ================================================

-- 1. admin_store_edit_requests テーブルに画像アップロード関連カラムを追加
ALTER TABLE admin_store_edit_requests
ADD COLUMN IF NOT EXISTS document_type text CHECK (document_type IN ('restaurant_license', 'late_night_license', 'corporate_registry', 'identity_document')) DEFAULT 'restaurant_license',
ADD COLUMN IF NOT EXISTS business_license_image text, -- 飲食店営業許可証の画像URL
ADD COLUMN IF NOT EXISTS additional_document_type text CHECK (additional_document_type IN ('late_night_license', 'corporate_registry', 'identity_document')),
ADD COLUMN IF NOT EXISTS additional_document_image text, -- 追加書類の画像URL
ADD COLUMN IF NOT EXISTS identity_document_image text, -- 身分証明書の画像URL
ADD COLUMN IF NOT EXISTS license_holder_name text, -- 許可証の名義人
ADD COLUMN IF NOT EXISTS applicant_relationship text CHECK (applicant_relationship IN ('owner', 'manager', 'employee', 'representative')) DEFAULT 'owner',
ADD COLUMN IF NOT EXISTS document_verification_status text CHECK (document_verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS verification_notes text; -- 確認時のメモ

-- 2. インデックスの追加
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_document_type ON admin_store_edit_requests(document_type);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_verification_status ON admin_store_edit_requests(document_verification_status);

-- 3. 既存データの更新（business_license フィールドが存在する場合）
UPDATE admin_store_edit_requests
SET license_holder_name = applicant_name
WHERE license_holder_name IS NULL;

-- 4. 書類確認用の関数
CREATE OR REPLACE FUNCTION verify_documents(
    p_request_id uuid,
    p_verification_status text,
    p_verification_notes text DEFAULT NULL,
    p_admin_id uuid DEFAULT NULL
) RETURNS json AS $$
DECLARE
    v_result json;
BEGIN
    -- ステータスを更新
    UPDATE admin_store_edit_requests
    SET document_verification_status = p_verification_status,
        verification_notes = p_verification_notes,
        reviewed_by = p_admin_id,
        reviewed_at = CASE
            WHEN p_verification_status IN ('verified', 'rejected') THEN now()
            ELSE reviewed_at
        END
    WHERE id = p_request_id;

    -- 結果を返す
    IF FOUND THEN
        RETURN json_build_object(
            'success', true,
            'message', '書類確認ステータスを更新しました',
            'verification_status', p_verification_status
        );
    ELSE
        RETURN json_build_object(
            'success', false,
            'message', '申請が見つかりません'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;