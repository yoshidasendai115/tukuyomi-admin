-- admin_store_edit_requests.business_typeをtext型からuuid型（genre_id）に変更

-- 1. 新しいカラムを追加
ALTER TABLE admin_store_edit_requests ADD COLUMN IF NOT EXISTS genre_id uuid;

-- 2. 既存のbusiness_typeデータをgenre_idに変換
-- 'girls_bar' -> ガールズバーのUUID
UPDATE admin_store_edit_requests
SET genre_id = '1018d63e-69f0-4f74-97e7-82c913f3008f'
WHERE business_type = 'girls_bar';

-- 'cabaret_club' -> キャバクラのUUID
UPDATE admin_store_edit_requests
SET genre_id = 'c4dffafd-0440-41ec-a53b-9ab622a3c265'
WHERE business_type = 'cabaret_club';

-- 'lounge' -> ラウンジのUUID
UPDATE admin_store_edit_requests
SET genre_id = '56a14f76-1789-4b49-92e4-6fb08772ec79'
WHERE business_type = 'lounge';

-- 'snack' -> スナックのUUID
UPDATE admin_store_edit_requests
SET genre_id = 'fb1e567d-e692-4e36-bcab-dcecb97c7c05'
WHERE business_type = 'snack';

-- 'club' -> クラブのUUID
UPDATE admin_store_edit_requests
SET genre_id = '97cae1f8-b372-4ffa-ad2e-26f610f383cd'
WHERE business_type = 'club';

-- 'bar' -> バーのUUID
UPDATE admin_store_edit_requests
SET genre_id = '50182e2a-3d21-428e-b277-b09061859ae0'
WHERE business_type = 'bar';

-- 'pub' -> パブのUUID
UPDATE admin_store_edit_requests
SET genre_id = '04192785-9b26-41d8-b33f-27d9ee98fc46'
WHERE business_type = 'pub';

-- 'karaoke' -> カラオケのUUID
UPDATE admin_store_edit_requests
SET genre_id = '60f245c4-10bf-41e0-917a-6b55d5606afd'
WHERE business_type = 'karaoke';

-- 3. 外部キー制約を追加
ALTER TABLE admin_store_edit_requests
ADD CONSTRAINT admin_store_edit_requests_genre_id_fkey
FOREIGN KEY (genre_id) REFERENCES genres(id);

-- 4. 古いbusiness_typeカラムを削除
ALTER TABLE admin_store_edit_requests DROP COLUMN IF EXISTS business_type;

-- 5. カラムコメントを追加
COMMENT ON COLUMN admin_store_edit_requests.genre_id IS '業態ID（genresテーブルへの参照）';
