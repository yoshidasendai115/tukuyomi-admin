-- stationsテーブルを作成（ga-incデータベース用）
CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "index_letter" character varying,
    "latitude" numeric,
    "longitude" numeric,
    "is_within_tokyo23" boolean DEFAULT true,
    "railway_lines" "text"[] DEFAULT '{}'::"text"[],
    "line_orders" "jsonb" DEFAULT '{}'::"jsonb",
    "is_major" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);

-- PRIMARY KEYを設定
ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");

-- コメントを追加
COMMENT ON TABLE "public"."stations" IS '駅マスタ（旧areasテーブル）';
COMMENT ON COLUMN "public"."stations"."id" IS '駅ID';
COMMENT ON COLUMN "public"."stations"."name" IS '駅名';
COMMENT ON COLUMN "public"."stations"."index_letter" IS 'インデックス文字（50音順）';
COMMENT ON COLUMN "public"."stations"."latitude" IS '緯度';
COMMENT ON COLUMN "public"."stations"."longitude" IS '経度';
COMMENT ON COLUMN "public"."stations"."is_within_tokyo23" IS '東京23区内フラグ';
COMMENT ON COLUMN "public"."stations"."railway_lines" IS '通過する路線名の配列';
COMMENT ON COLUMN "public"."stations"."line_orders" IS '各路線での駅順序（JSONB）';
COMMENT ON COLUMN "public"."stations"."is_major" IS '主要駅フラグ';
COMMENT ON COLUMN "public"."stations"."display_order" IS '表示順序';
COMMENT ON COLUMN "public"."stations"."created_at" IS '作成日時';

-- インデックスを作成
CREATE INDEX IF NOT EXISTS "idx_stations_name" ON "public"."stations" USING "btree" ("name");
CREATE INDEX IF NOT EXISTS "idx_stations_is_major" ON "public"."stations" USING "btree" ("is_major");

-- 結果確認
SELECT 'stationsテーブルの作成が完了しました' as status;
