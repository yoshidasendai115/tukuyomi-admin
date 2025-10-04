-- リモートstationsテーブルに不足しているカラムを追加してからデータを同期

-- Step 1: 不足しているカラムを追加
ALTER TABLE stations ADD COLUMN IF NOT EXISTS index_letter VARCHAR;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_within_tokyo23 BOOLEAN DEFAULT true;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS railway_lines TEXT[] DEFAULT '{}'::TEXT[];
ALTER TABLE stations ADD COLUMN IF NOT EXISTS line_orders JSONB DEFAULT '{}'::JSONB;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_major BOOLEAN DEFAULT false;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Step 2: インデックスを追加
CREATE INDEX IF NOT EXISTS idx_stations_coordinates ON stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_stations_index_letter ON stations(index_letter);
CREATE INDEX IF NOT EXISTS idx_stations_is_major ON stations(is_major);
CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);

-- Step 3: 既存データを削除
DELETE FROM stations;

-- Step 4: ローカルデータを挿入（sync_stations_to_remote.sqlの内容をここに続ける）
-- 注：この後に、sync_stations_to_remote.sqlのINSERT文をコピー＆ペーストしてください
