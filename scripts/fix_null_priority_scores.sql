-- priority_score が NULL の店舗を 0 (Free) に設定

-- Step 1: NULL値を0に更新
UPDATE stores
SET priority_score = 0
WHERE priority_score IS NULL;

-- Step 2: 確認 - プラン別の店舗数を表示
SELECT
  CASE
    WHEN priority_score = 0 THEN 'Free (0)'
    WHEN priority_score = 3 THEN 'Standard (3)'
    WHEN priority_score = 5 THEN 'Premium (5)'
    ELSE 'その他 (' || COALESCE(priority_score::text, 'NULL') || ')'
  END as plan,
  COUNT(*) as count
FROM stores
GROUP BY priority_score
ORDER BY priority_score NULLS FIRST;

-- Step 3: 総店舗数確認
SELECT COUNT(*) as total_stores FROM stores;
