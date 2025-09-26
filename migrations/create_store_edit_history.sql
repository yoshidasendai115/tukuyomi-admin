-- store_edit_history テーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS store_edit_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    token_id uuid REFERENCES admin_store_edit_tokens(id),
    edited_by text, -- トークンID、ユーザーID、または識別子
    edited_at timestamp with time zone DEFAULT now(),
    action text CHECK (action IN ('create', 'update', 'delete')),
    changes jsonb, -- 変更内容をJSON形式で保存
    previous_values jsonb, -- 変更前の値
    new_values jsonb, -- 変更後の値
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_store_edit_history_store_id ON store_edit_history(store_id);
CREATE INDEX IF NOT EXISTS idx_store_edit_history_edited_at ON store_edit_history(edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_edit_history_edited_by ON store_edit_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_store_edit_history_action ON store_edit_history(action);

-- コメント
COMMENT ON TABLE store_edit_history IS '店舗情報の編集履歴';
COMMENT ON COLUMN store_edit_history.store_id IS '対象店舗ID';
COMMENT ON COLUMN store_edit_history.token_id IS '使用されたトークンID';
COMMENT ON COLUMN store_edit_history.edited_by IS '編集者の識別子';
COMMENT ON COLUMN store_edit_history.action IS '操作種別: create=新規作成, update=更新, delete=削除';
COMMENT ON COLUMN store_edit_history.changes IS '変更されたフィールドと変更内容';
COMMENT ON COLUMN store_edit_history.previous_values IS '変更前の全フィールド値';
COMMENT ON COLUMN store_edit_history.new_values IS '変更後の全フィールド値';