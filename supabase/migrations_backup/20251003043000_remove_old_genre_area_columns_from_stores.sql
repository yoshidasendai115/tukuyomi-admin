-- storesテーブルから旧式のgenre(text)とarea(text)カラムを削除
-- genre_id(uuid)とarea_id(uuid)が実際に使用されているため、text型カラムは不要

-- 旧式カラムを削除
ALTER TABLE stores DROP COLUMN IF EXISTS genre;
ALTER TABLE stores DROP COLUMN IF EXISTS area;

-- カラムコメントを追加
COMMENT ON COLUMN stores.genre_id IS '業態ID（genresテーブルへの参照）';
COMMENT ON COLUMN stores.area_id IS 'エリアID（areasテーブルへの参照）';
