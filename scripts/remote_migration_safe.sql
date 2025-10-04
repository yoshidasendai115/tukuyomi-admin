-- リモートSupabase用の安全なマイグレーション
-- データを一切削除せず、スキーマのみ変更

-- ============================================
-- ステップ1: priority_scoreのCHECK制約を変更
-- ============================================

-- 既存のCHECK制約を削除
ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_priority_score_check;

-- 新しいCHECK制約を追加（0, 3, 5のみ許可）
ALTER TABLE stores ADD CONSTRAINT stores_priority_score_check
  CHECK (priority_score IN (0, 3, 5));

-- カラムコメントを更新
COMMENT ON COLUMN stores.priority_score IS '優先表示プラン (0:Free無料, 3:Standard月980円, 5:Premium月1,980円)';

-- ============================================
-- ステップ2: is_recommendedカラムの削除
-- ============================================

-- is_recommendedカラムを削除（データは影響なし）
ALTER TABLE stores DROP COLUMN IF EXISTS is_recommended;

-- 不要なインデックスを削除
DROP INDEX IF EXISTS idx_stores_is_recommended;
DROP INDEX IF EXISTS idx_stores_recommended_priority;

-- テーブルコメント更新
COMMENT ON TABLE stores IS 'おすすめ判定はpriority_scoreで自動判定（3または5の場合におすすめ）';

-- ============================================
-- 完了メッセージ
-- ============================================
-- このマイグレーションは既存データを一切削除しません
-- priority_scoreの値はそのまま保持されます
