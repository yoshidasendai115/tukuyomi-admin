-- station_groups と station_group_members テーブルに並び順とコメントを追加

-- ========================================
-- station_groups テーブルの更新
-- ========================================

-- display_orderカラムを追加
ALTER TABLE station_groups ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_station_groups_display_order ON station_groups (display_order);

-- カラムコメントを追加
COMMENT ON COLUMN station_groups.id IS '駅グループID';
COMMENT ON COLUMN station_groups.name IS '駅グループ名（内部用）';
COMMENT ON COLUMN station_groups.display_name IS '表示名';
COMMENT ON COLUMN station_groups.display_order IS '表示順序';
COMMENT ON COLUMN station_groups.is_major_terminal IS '主要ターミナル駅フラグ';
COMMENT ON COLUMN station_groups.description IS '説明';
COMMENT ON COLUMN station_groups.created_at IS '作成日時';

-- テーブルコメント
COMMENT ON TABLE station_groups IS '駅グループマスタ（エリア区分として使用）';

-- ========================================
-- station_group_members テーブルの更新
-- ========================================

-- カラムコメントを追加
COMMENT ON COLUMN station_group_members.id IS '駅グループメンバーID';
COMMENT ON COLUMN station_group_members.group_id IS '駅グループID（station_groupsへの参照）';
COMMENT ON COLUMN station_group_members.station_id IS '駅ID（stationsへの参照）';
COMMENT ON COLUMN station_group_members.is_primary IS '主要駅フラグ';
COMMENT ON COLUMN station_group_members.walking_minutes IS '徒歩時間（分）';
COMMENT ON COLUMN station_group_members.created_at IS '作成日時';

-- テーブルコメント
COMMENT ON TABLE station_group_members IS '駅グループメンバー（駅グループに所属する駅のリスト）';

-- ========================================
-- stations テーブルの更新
-- ========================================

-- カラムコメントを追加
COMMENT ON COLUMN stations.id IS '駅ID';
COMMENT ON COLUMN stations.name IS '駅名';
COMMENT ON COLUMN stations.index_letter IS 'インデックス文字（50音順）';
COMMENT ON COLUMN stations.latitude IS '緯度';
COMMENT ON COLUMN stations.longitude IS '経度';
COMMENT ON COLUMN stations.is_within_tokyo23 IS '東京23区内フラグ';
COMMENT ON COLUMN stations.railway_lines IS '路線名リスト';
COMMENT ON COLUMN stations.line_orders IS '路線順序情報（JSON）';
COMMENT ON COLUMN stations.is_major IS '主要駅フラグ';
COMMENT ON COLUMN stations.display_order IS '表示順序';
COMMENT ON COLUMN stations.created_at IS '作成日時';

-- テーブルコメント
COMMENT ON TABLE stations IS '駅マスタ（旧areasテーブル）';
