-- admin_store_edit_requests テーブルの genre_id に外部キー制約を追加

-- Step 1: 現在の外部キー制約を確認
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'admin_store_edit_requests';

-- Step 2: genre_id カラムが存在するか確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'admin_store_edit_requests'
    AND column_name = 'genre_id';

-- Step 3: 外部キー制約を追加（存在しない場合）
-- 注意: genre_id が NULL 許可の場合、既存の NULL 値は問題ない
ALTER TABLE admin_store_edit_requests
    ADD CONSTRAINT admin_store_edit_requests_genre_id_fkey
    FOREIGN KEY (genre_id)
    REFERENCES genres(id)
    ON DELETE SET NULL;

-- Step 4: 確認
SELECT
    tc.constraint_name,
    tc.table_name,
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
