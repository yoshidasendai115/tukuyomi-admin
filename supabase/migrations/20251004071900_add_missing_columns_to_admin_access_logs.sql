-- admin_access_logsテーブルに不足しているカラムを追加

ALTER TABLE admin_access_logs
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS country text;

-- インデックスを追加（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_session_id ON admin_access_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_logs_action ON admin_access_logs(action);
