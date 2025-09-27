-- ================================================
-- GA社が店舗への連絡に使用する電話番号カラムを追加
-- ================================================

-- storesテーブルにcontact_phone_for_gaカラムを追加
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS contact_phone_for_ga text;

-- カラムにコメントを追加
COMMENT ON COLUMN stores.contact_phone_for_ga IS 'GA社から店舗への連絡用電話番号（お客様向けの掲載電話番号とは異なる）';