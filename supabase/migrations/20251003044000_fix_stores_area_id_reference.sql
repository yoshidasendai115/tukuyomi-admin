-- stores.area_idカラムを追加してstation_groupsテーブルへの参照を設定

-- area_idカラムを追加（存在しない場合）
ALTER TABLE stores ADD COLUMN IF NOT EXISTS area_id uuid;

-- station_groupsへの外部キー制約を追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'stores_area_id_fkey'
    ) THEN
        ALTER TABLE stores
        ADD CONSTRAINT stores_area_id_fkey
        FOREIGN KEY (area_id) REFERENCES station_groups(id);
    END IF;
END $$;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_stores_area_id ON stores (area_id);

-- カラムコメントを追加
COMMENT ON COLUMN stores.area_id IS 'エリアID（station_groupsテーブルへの参照）';
