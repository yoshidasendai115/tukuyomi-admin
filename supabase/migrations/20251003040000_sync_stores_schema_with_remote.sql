-- リモート環境のstoresテーブル定義に合わせてローカルを更新

-- 不足しているカラムを追加
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone_for_ga text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS recommended_at timestamp with time zone;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS recommended_by uuid;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS sync_priority integer DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS calculated_rating numeric(3,2) DEFAULT 0;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS calculated_review_count integer DEFAULT 0;

-- 外部キー制約を追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stores_recommended_by_fkey'
    ) THEN
        ALTER TABLE stores
        ADD CONSTRAINT stores_recommended_by_fkey
        FOREIGN KEY (recommended_by) REFERENCES admin_auth_users(id);
    END IF;
END $$;

-- priority_scoreのデータ型をintegerに変更（リモートに合わせる）
ALTER TABLE stores ALTER COLUMN priority_score TYPE integer USING priority_score::integer;

-- priority_scoreのCHECK制約を追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stores_priority_score_check'
    ) THEN
        ALTER TABLE stores
        ADD CONSTRAINT stores_priority_score_check
        CHECK ((priority_score >= 0) AND (priority_score <= 100));
    END IF;
END $$;

-- 不足しているインデックスを追加
CREATE INDEX IF NOT EXISTS idx_stores_recommended_at ON stores (recommended_at);
CREATE INDEX IF NOT EXISTS idx_stores_recommended_priority ON stores (is_recommended, priority_score DESC) WHERE (is_recommended = true);

-- インデックスを削除して再作成（定義が異なる場合）
DROP INDEX IF EXISTS idx_stores_is_recommended;
CREATE INDEX idx_stores_is_recommended ON stores (is_recommended);

DROP INDEX IF EXISTS idx_stores_priority_score;
CREATE INDEX idx_stores_priority_score ON stores (priority_score);

-- カラムコメントを追加
COMMENT ON COLUMN stores.contact_phone_for_ga IS 'GA社から店舗への連絡用電話番号（お客様向けの掲載電話番号とは異なる）';
COMMENT ON COLUMN stores.is_recommended IS 'システム管理者が設定するおすすめ店舗フラグ';
COMMENT ON COLUMN stores.priority_score IS '優先表示の重み付け（0-100、高いほど優先）';
COMMENT ON COLUMN stores.recommendation_reason IS 'おすすめ理由';
COMMENT ON COLUMN stores.recommended_at IS 'おすすめ設定日時';
COMMENT ON COLUMN stores.recommended_by IS '設定した管理者のID';
COMMENT ON COLUMN stores.hours_monday_open IS '月曜日開店時刻';
COMMENT ON COLUMN stores.hours_monday_close IS '月曜日閉店時刻';
COMMENT ON COLUMN stores.hours_monday_closed IS '月曜日休業フラグ';
COMMENT ON COLUMN stores.hours_tuesday_open IS '火曜日開店時刻';
COMMENT ON COLUMN stores.hours_tuesday_close IS '火曜日閉店時刻';
COMMENT ON COLUMN stores.hours_tuesday_closed IS '火曜日休業フラグ';
COMMENT ON COLUMN stores.hours_wednesday_open IS '水曜日開店時刻';
COMMENT ON COLUMN stores.hours_wednesday_close IS '水曜日閉店時刻';
COMMENT ON COLUMN stores.hours_wednesday_closed IS '水曜日休業フラグ';
COMMENT ON COLUMN stores.hours_thursday_open IS '木曜日開店時刻';
COMMENT ON COLUMN stores.hours_thursday_close IS '木曜日閉店時刻';
COMMENT ON COLUMN stores.hours_thursday_closed IS '木曜日休業フラグ';
COMMENT ON COLUMN stores.hours_friday_open IS '金曜日開店時刻';
COMMENT ON COLUMN stores.hours_friday_close IS '金曜日閉店時刻';
COMMENT ON COLUMN stores.hours_friday_closed IS '金曜日休業フラグ';
COMMENT ON COLUMN stores.hours_saturday_open IS '土曜日開店時刻';
COMMENT ON COLUMN stores.hours_saturday_close IS '土曜日閉店時刻';
COMMENT ON COLUMN stores.hours_saturday_closed IS '土曜日休業フラグ';
COMMENT ON COLUMN stores.hours_sunday_open IS '日曜日開店時刻';
COMMENT ON COLUMN stores.hours_sunday_close IS '日曜日閉店時刻';
COMMENT ON COLUMN stores.hours_sunday_closed IS '日曜日休業フラグ';
COMMENT ON COLUMN stores.calculated_rating IS 'Average rating calculated from system reviews';
COMMENT ON COLUMN stores.calculated_review_count IS 'Count of reviews from this system';
