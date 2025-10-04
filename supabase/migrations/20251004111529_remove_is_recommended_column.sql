-- is_recommendedカラムを削除し、priority_scoreで判定するよう変更

-- ステップ1: 既存データを保持したままpriority_scoreベースでis_recommendedを更新
UPDATE stores
SET is_recommended = (priority_score IN (3, 5));

-- ステップ2: is_recommendedカラムを削除
ALTER TABLE stores DROP COLUMN IF EXISTS is_recommended;

-- ステップ3: 不要なインデックスを削除
DROP INDEX IF EXISTS idx_stores_is_recommended;
DROP INDEX IF EXISTS idx_stores_recommended_priority;

-- ステップ4: テーブルコメント更新
COMMENT ON TABLE stores IS 'おすすめ判定はpriority_scoreで自動判定（3または5の場合におすすめ）';
