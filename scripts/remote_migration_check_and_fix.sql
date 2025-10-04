-- ステップ1: 現在のpriority_scoreの値分布を確認
SELECT priority_score, COUNT(*) as count
FROM stores
GROUP BY priority_score
ORDER BY priority_score;

-- ステップ2: 既存データを0, 3, 5に変換（データを保持）
-- 1-2 → 3 (Standard)に変換
-- 4-100 → 5 (Premium)に変換
-- それ以外 → 0 (Free)に変換
UPDATE stores
SET priority_score = CASE
  WHEN priority_score BETWEEN 1 AND 2 THEN 3
  WHEN priority_score BETWEEN 4 AND 100 THEN 5
  ELSE 0
END
WHERE priority_score NOT IN (0, 3, 5);

-- ステップ3: 変換後の確認
SELECT priority_score, COUNT(*) as count
FROM stores
GROUP BY priority_score
ORDER BY priority_score;

-- ステップ4: CHECK制約を削除
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_priority_score_check;

-- ステップ5: 新しいCHECK制約を追加（0, 3, 5のみ許可）
ALTER TABLE stores ADD CONSTRAINT stores_priority_score_check
  CHECK (priority_score IN (0, 3, 5));

-- ステップ6: カラムコメントを更新
COMMENT ON COLUMN stores.priority_score IS '優先表示プラン (0:Free無料, 3:Standard月980円, 5:Premium月1,980円)';

-- ステップ7: is_recommendedカラムの削除
ALTER TABLE stores DROP COLUMN IF EXISTS is_recommended;

-- ステップ8: 不要なインデックスを削除
DROP INDEX IF EXISTS idx_stores_is_recommended;
DROP INDEX IF EXISTS idx_stores_recommended_priority;

-- ステップ9: テーブルコメント更新
COMMENT ON TABLE stores IS 'おすすめ判定はpriority_scoreで自動判定（3または5の場合におすすめ）';
