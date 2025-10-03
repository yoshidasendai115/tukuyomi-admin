-- リモートのstation関連データをローカルに適用

-- ========================================
-- 1. 外部キー制約を一時削除
-- ========================================

ALTER TABLE IF EXISTS station_group_members DROP CONSTRAINT IF EXISTS station_group_members_station_id_fkey;
ALTER TABLE IF EXISTS station_group_members DROP CONSTRAINT IF EXISTS station_group_members_group_id_fkey;
ALTER TABLE IF EXISTS stores DROP CONSTRAINT IF EXISTS stores_station_id_fkey;
ALTER TABLE IF EXISTS stores DROP CONSTRAINT IF EXISTS stores_area_id_fkey;
ALTER TABLE IF EXISTS cast_profiles DROP CONSTRAINT IF EXISTS cast_profiles_nearest_station_id_fkey;
ALTER TABLE IF EXISTS guest_profiles DROP CONSTRAINT IF EXISTS guest_profiles_nearest_station_id_fkey;

-- ========================================
-- 2. 既存データを削除（塗り替え）
-- ========================================

TRUNCATE TABLE station_group_members CASCADE;
TRUNCATE TABLE station_groups CASCADE;
TRUNCATE TABLE stations CASCADE;

-- ========================================
-- 3. リモートデータをインポート
-- ========================================

-- このファイルは手動でCSVインポートコマンドを実行する必要があります
-- 以下のコマンドを実行してください：

-- \COPY stations FROM '/tmp/areas_data.csv' WITH (FORMAT CSV, HEADER true);
-- \COPY station_groups FROM '/tmp/station_groups_data.csv' WITH (FORMAT CSV, HEADER true);
-- \COPY station_group_members FROM '/tmp/station_group_members_data.csv' WITH (FORMAT CSV, HEADER true);

-- ========================================
-- 4. 外部キー制約を再作成
-- ========================================

ALTER TABLE station_group_members
ADD CONSTRAINT station_group_members_group_id_fkey
FOREIGN KEY (group_id) REFERENCES station_groups(id) ON DELETE CASCADE;

ALTER TABLE station_group_members
ADD CONSTRAINT station_group_members_station_id_fkey
FOREIGN KEY (station_id) REFERENCES stations(id);

ALTER TABLE stores
ADD CONSTRAINT stores_station_id_fkey
FOREIGN KEY (station_id) REFERENCES stations(id);

ALTER TABLE stores
ADD CONSTRAINT stores_area_id_fkey
FOREIGN KEY (area_id) REFERENCES station_groups(id);

ALTER TABLE cast_profiles
ADD CONSTRAINT cast_profiles_nearest_station_id_fkey
FOREIGN KEY (nearest_station_id) REFERENCES stations(id);

ALTER TABLE guest_profiles
ADD CONSTRAINT guest_profiles_nearest_station_id_fkey
FOREIGN KEY (nearest_station_id) REFERENCES stations(id);
