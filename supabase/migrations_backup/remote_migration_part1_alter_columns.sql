-- ============================================================================
-- Part 1: 既存テーブルへのカラム追加 (ALTER TABLE)
-- 安全なマイグレーション：既存データを削除せずにカラムのみ追加
-- ============================================================================

-- ============================================================================
-- 1. storesテーブルへのカラム追加
-- ============================================================================

-- 連絡先電話番号（GA用）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS contact_phone_for_ga text;

-- 推奨店舗関連
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_score integer,
ADD COLUMN IF NOT EXISTS recommendation_reason text,
ADD COLUMN IF NOT EXISTS recommended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS recommended_by uuid;

-- 営業時間詳細（月曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_monday_open time,
ADD COLUMN IF NOT EXISTS hours_monday_close time,
ADD COLUMN IF NOT EXISTS hours_monday_closed boolean DEFAULT false;

-- 営業時間詳細（火曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_tuesday_open time,
ADD COLUMN IF NOT EXISTS hours_tuesday_close time,
ADD COLUMN IF NOT EXISTS hours_tuesday_closed boolean DEFAULT false;

-- 営業時間詳細（水曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_wednesday_open time,
ADD COLUMN IF NOT EXISTS hours_wednesday_close time,
ADD COLUMN IF NOT EXISTS hours_wednesday_closed boolean DEFAULT false;

-- 営業時間詳細（木曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_thursday_open time,
ADD COLUMN IF NOT EXISTS hours_thursday_close time,
ADD COLUMN IF NOT EXISTS hours_thursday_closed boolean DEFAULT false;

-- 営業時間詳細（金曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_friday_open time,
ADD COLUMN IF NOT EXISTS hours_friday_close time,
ADD COLUMN IF NOT EXISTS hours_friday_closed boolean DEFAULT false;

-- 営業時間詳細（土曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_saturday_open time,
ADD COLUMN IF NOT EXISTS hours_saturday_close time,
ADD COLUMN IF NOT EXISTS hours_saturday_closed boolean DEFAULT false;

-- 営業時間詳細（日曜日）
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_sunday_open time,
ADD COLUMN IF NOT EXISTS hours_sunday_close time,
ADD COLUMN IF NOT EXISTS hours_sunday_closed boolean DEFAULT false;

-- その他のカラム
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS opening_hours_text text,
ADD COLUMN IF NOT EXISTS sync_priority integer;

-- ============================================================================
-- 2. stationsテーブルへのカラム追加
-- ============================================================================

ALTER TABLE stations
ADD COLUMN IF NOT EXISTS railway_lines jsonb,
ADD COLUMN IF NOT EXISTS line_orders jsonb;

-- ============================================================================
-- 3. messagesテーブルへのカラム追加
-- ============================================================================

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS thread_id uuid;

-- ============================================================================
-- インデックスの作成（パフォーマンス向上のため）
-- ============================================================================

-- storesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_stores_is_recommended ON stores(is_recommended);
CREATE INDEX IF NOT EXISTS idx_stores_priority_score ON stores(priority_score);
CREATE INDEX IF NOT EXISTS idx_stores_recommended_at ON stores(recommended_at);

-- messagesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_cancelled ON messages(is_cancelled);

-- ============================================================================
-- コメントの追加（ドキュメント化）
-- ============================================================================

COMMENT ON COLUMN stores.contact_phone_for_ga IS 'Google Analytics用の連絡先電話番号';
COMMENT ON COLUMN stores.is_recommended IS '推奨店舗フラグ';
COMMENT ON COLUMN stores.priority_score IS '優先度スコア';
COMMENT ON COLUMN stores.recommendation_reason IS '推奨理由';
COMMENT ON COLUMN stores.recommended_at IS '推奨設定日時';
COMMENT ON COLUMN stores.recommended_by IS '推奨設定者';

COMMENT ON COLUMN areas.railway_lines IS '鉄道路線情報（JSON形式）';
COMMENT ON COLUMN areas.line_orders IS '路線の表示順序（JSON形式）';

COMMENT ON COLUMN messages.is_cancelled IS 'メッセージキャンセルフラグ';
COMMENT ON COLUMN messages.thread_id IS 'メッセージスレッドID';

-- ============================================================================
-- 実行完了メッセージ
-- ============================================================================
-- Part 1 完了: 既存テーブルへのカラム追加が完了しました
-- 次は Part 2 を実行してください