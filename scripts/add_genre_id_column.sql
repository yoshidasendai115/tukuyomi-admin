-- admin_store_edit_requests テーブルに genre_id カラムを追加

-- Step 1: テーブルの現在のカラムを確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_store_edit_requests'
ORDER BY ordinal_position;

-- Step 2: genre_id カラムを追加
ALTER TABLE admin_store_edit_requests
ADD COLUMN IF NOT EXISTS genre_id UUID;

-- Step 3: 外部キー制約を追加
ALTER TABLE admin_store_edit_requests
ADD CONSTRAINT admin_store_edit_requests_genre_id_fkey
FOREIGN KEY (genre_id)
REFERENCES genres(id)
ON DELETE SET NULL;

-- Step 4: 確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_store_edit_requests'
    AND column_name = 'genre_id';

-- Step 5: 外部キー制約を確認
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'admin_store_edit_requests'
    AND kcu.column_name = 'genre_id';
