-- admin_usersテーブルにassigned_store_idカラムを追加
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS assigned_store_id UUID,
ADD CONSTRAINT fk_admin_users_assigned_store
  FOREIGN KEY (assigned_store_id)
  REFERENCES stores(id)
  ON DELETE SET NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_admin_users_assigned_store_id ON admin_users(assigned_store_id);

-- コメント追加
COMMENT ON COLUMN admin_users.assigned_store_id IS 'store_ownerロールに割り当てられた店舗ID';
