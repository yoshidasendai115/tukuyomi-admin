-- admin_usersテーブルを削除
-- admin_auth_usersテーブルが実際の認証・管理者管理に使用されているため、admin_usersは不要

-- 依存する外部キー制約を持つテーブルがないか確認
-- stores.last_updated_by、stores.verified_byなどはusersテーブルを参照している

-- admin_usersテーブルを削除
DROP TABLE IF EXISTS admin_users;

COMMENT ON TABLE admin_auth_users IS '管理者認証テーブル（ロールベースアクセス制御）';
