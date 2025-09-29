-- ============================================================================
-- Part 0: リモートのstoresテーブルに不足しているカラムを追加
-- ローカルとリモートの差分を解消
-- ============================================================================

-- ============================================================================
-- リモートに存在しないカラムを追加
-- ============================================================================

-- リモートには以下のカラムが存在しない：
-- secondary_phone → 削除されてローカルには存在しない
-- fax_number → 削除されてローカルには存在しない
-- penalty_system → 削除されてローカルには存在しない
-- has_cocktail_icon → リモート特有（保持）

-- opening_hours_text: リモートはtext[]、ローカルはtext → スキップ（既存のまま）

-- sync_priorityはリモートに存在するがデフォルト値がない
ALTER TABLE stores
ALTER COLUMN sync_priority SET DEFAULT 0;

-- ============================================================================
-- リモートにのみ必要な制約の追加
-- ============================================================================

-- priority_scoreのチェック制約を追加（ローカルにあってリモートにない）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'stores_priority_score_check'
        AND table_name = 'stores'
    ) THEN
        ALTER TABLE stores
        ADD CONSTRAINT stores_priority_score_check
        CHECK ((priority_score >= 0) AND (priority_score <= 100));
    END IF;
END $$;

-- ============================================================================
-- インデックスの差分を解消
-- ============================================================================

-- ローカルにあってリモートにないインデックス
CREATE INDEX IF NOT EXISTS idx_stores_priority_score ON stores(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_stores_recommended_priority ON stores(is_recommended, priority_score DESC) WHERE (is_recommended = true);

-- ============================================================================
-- カラムコメントの更新
-- ============================================================================

-- ローカルと同じコメントに更新
COMMENT ON COLUMN stores.custom_notes IS '店舗オーナーが自由に記入できるメモ・お知らせ欄';
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
COMMENT ON COLUMN stores.contact_phone_for_ga IS 'GA社から店舗への連絡用電話番号（お客様向けの掲載電話番号とは異なる）';
COMMENT ON COLUMN stores.is_recommended IS 'システム管理者が設定するおすすめ店舗フラグ';
COMMENT ON COLUMN stores.priority_score IS '優先表示の重み付け（0-100、高いほど優先）';
COMMENT ON COLUMN stores.recommendation_reason IS 'おすすめ理由';
COMMENT ON COLUMN stores.recommended_at IS 'おすすめ設定日時';
COMMENT ON COLUMN stores.recommended_by IS '設定した管理者のID';

-- ============================================================================
-- 実行完了メッセージ
-- ============================================================================
-- Part 0 完了: storesテーブルの差分解消が完了しました
--
-- 注意事項：
-- 1. リモート特有のカラム（has_cocktail_icon, secondary_phone, fax_number, penalty_system）は保持
-- 2. opening_hours_textの型の違い（text[] vs text）は既存のまま保持
-- 3. sync_priorityにデフォルト値を設定
-- 4. priority_scoreにチェック制約を追加
--
-- 次は Part 1 を実行してください
-- ============================================================================