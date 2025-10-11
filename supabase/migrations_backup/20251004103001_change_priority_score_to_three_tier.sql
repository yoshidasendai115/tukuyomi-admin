-- 優先表示システムを3段階制に変更
-- Free(0) / Standard(3) / Premium(5)

-- ステップ1: 全店舗のpriority_scoreを0にリセット
UPDATE stores SET priority_score = 0;

-- ステップ2: 既存のCHECK制約を削除
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_priority_score_check;

-- ステップ3: 新しいCHECK制約を追加（0, 3, 5のみ許可）
ALTER TABLE stores ADD CONSTRAINT stores_priority_score_check
  CHECK (priority_score IN (0, 3, 5));

-- ステップ4: カラムコメントを更新
COMMENT ON COLUMN stores.priority_score IS '優先表示プラン (0:Free無料, 3:Standard月980円, 5:Premium月1,980円)';
