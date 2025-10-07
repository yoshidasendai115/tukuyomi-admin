-- reviewsテーブルに論理削除用カラムを追加
ALTER TABLE reviews
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_reviews_is_deleted ON reviews(is_deleted);

-- コメント追加
COMMENT ON COLUMN reviews.is_deleted IS '削除済みフラグ';
COMMENT ON COLUMN reviews.deleted_at IS '削除日時';
COMMENT ON COLUMN reviews.deleted_by IS '削除した管理者ID';
COMMENT ON COLUMN reviews.deletion_reason IS '削除理由';
