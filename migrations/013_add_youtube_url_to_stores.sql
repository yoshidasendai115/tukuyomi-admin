-- ================================================
-- storesテーブルにYouTube URLカラムを追加
-- ================================================

-- YouTube URLカラムを追加
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS sns_youtube text;

-- コメント追加
COMMENT ON COLUMN stores.sns_youtube IS 'YouTube チャンネルまたは動画のURL';
