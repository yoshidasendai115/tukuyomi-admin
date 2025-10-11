-- 駅グループと駅グループメンバーテーブルの作成

-- station_groupsテーブル（既存の場合はスキップ）
CREATE TABLE IF NOT EXISTS station_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    display_name text NOT NULL,
    is_major_terminal boolean DEFAULT false,
    description text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- station_group_membersテーブル
CREATE TABLE IF NOT EXISTS station_group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL,
    station_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    walking_minutes integer,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(group_id, station_id)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_station_groups_display_order ON station_groups (display_order);
CREATE INDEX IF NOT EXISTS idx_station_group_members_group_id ON station_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_station_group_members_area_id ON station_group_members (station_id);

-- 外部キー制約を追加
ALTER TABLE station_group_members
    DROP CONSTRAINT IF EXISTS station_group_members_group_id_fkey,
    ADD CONSTRAINT station_group_members_group_id_fkey
        FOREIGN KEY (group_id)
        REFERENCES station_groups(id)
        ON DELETE CASCADE;

ALTER TABLE station_group_members
    DROP CONSTRAINT IF EXISTS station_group_members_station_id_fkey,
    ADD CONSTRAINT station_group_members_station_id_fkey
        FOREIGN KEY (station_id)
        REFERENCES stations(id);

-- テーブルコメント
COMMENT ON TABLE station_groups IS '駅グループマスタ（エリア区分として使用）';
COMMENT ON TABLE station_group_members IS '駅グループメンバー（駅グループに所属する駅のリスト）';

-- station_groups カラムコメント
COMMENT ON COLUMN station_groups.id IS '駅グループID';
COMMENT ON COLUMN station_groups.name IS '駅グループ名（内部用）';
COMMENT ON COLUMN station_groups.display_name IS '表示名';
COMMENT ON COLUMN station_groups.display_order IS '表示順序';
COMMENT ON COLUMN station_groups.is_major_terminal IS '主要ターミナル駅フラグ';
COMMENT ON COLUMN station_groups.description IS '説明';
COMMENT ON COLUMN station_groups.created_at IS '作成日時';

-- station_group_members カラムコメント
COMMENT ON COLUMN station_group_members.id IS '駅グループメンバーID';
COMMENT ON COLUMN station_group_members.group_id IS '駅グループID（station_groupsへの参照）';
COMMENT ON COLUMN station_group_members.station_id IS '駅ID（stationsへの参照）';
COMMENT ON COLUMN station_group_members.is_primary IS '主要駅フラグ';
COMMENT ON COLUMN station_group_members.walking_minutes IS '徒歩時間（分）';
COMMENT ON COLUMN station_group_members.created_at IS '作成日時';
