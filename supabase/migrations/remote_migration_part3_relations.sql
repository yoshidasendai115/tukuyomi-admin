-- ============================================================================
-- Part 3: 関連テーブルと外部キー制約
-- 安全なマイグレーション：既存データを削除せずに関連テーブルを作成
-- ============================================================================

-- ============================================================================
-- 1. お気に入り・訪問履歴関連テーブル
-- ============================================================================

-- favoritesテーブル（ユーザーのお気に入り店舗）
CREATE TABLE IF NOT EXISTS favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, store_id)
);

-- favorite_storesテーブル（店舗のお気に入りリスト - 店舗側管理）
CREATE TABLE IF NOT EXISTS favorite_stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    tags text[],
    priority integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- visited_storesテーブル（店舗訪問履歴）
CREATE TABLE IF NOT EXISTS visited_stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    visited_at timestamp with time zone DEFAULT now(),
    duration_minutes integer,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- 2. ユーザーメッセージ関連テーブル
-- ============================================================================

-- user_messagesテーブル（ユーザー別メッセージ管理）
CREATE TABLE IF NOT EXISTS user_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_starred boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, message_id)
);

-- user_store_message_readsテーブル（ユーザーの店舗メッセージ既読管理）
CREATE TABLE IF NOT EXISTS user_store_message_reads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    store_message_id uuid REFERENCES store_messages(id) ON DELETE CASCADE,
    read_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, store_message_id)
);

-- ============================================================================
-- 3. 外部キー制約の追加（既存テーブルに対して）
-- ============================================================================

-- messagesテーブルへの外部キー制約（thread_idカラムが追加済みの場合）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'thread_id'
    ) THEN
        -- 外部キー制約が存在しない場合のみ追加
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'messages_thread_id_fkey'
        ) THEN
            ALTER TABLE messages
            ADD CONSTRAINT messages_thread_id_fkey
            FOREIGN KEY (thread_id) REFERENCES message_threads(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- storesテーブルへの外部キー制約（recommended_byカラムが追加済みの場合）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'recommended_by'
    ) THEN
        -- 外部キー制約が存在しない場合のみ追加
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'stores_recommended_by_fkey'
        ) THEN
            ALTER TABLE stores
            ADD CONSTRAINT stores_recommended_by_fkey
            FOREIGN KEY (recommended_by) REFERENCES admin_auth_users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 4. トリガー関数とトリガーの作成
-- ============================================================================

-- updated_at自動更新用の関数（存在しない場合のみ作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにupdated_atトリガーを追加
-- usersテーブル
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- profilesテーブル
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- cast_profilesテーブル
DROP TRIGGER IF EXISTS update_cast_profiles_updated_at ON cast_profiles;
CREATE TRIGGER update_cast_profiles_updated_at
    BEFORE UPDATE ON cast_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- guest_profilesテーブル
DROP TRIGGER IF EXISTS update_guest_profiles_updated_at ON guest_profiles;
CREATE TRIGGER update_guest_profiles_updated_at
    BEFORE UPDATE ON guest_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- message_threadsテーブル
DROP TRIGGER IF EXISTS update_message_threads_updated_at ON message_threads;
CREATE TRIGGER update_message_threads_updated_at
    BEFORE UPDATE ON message_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- message_templatesテーブル
DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- broadcast_messagesテーブル
DROP TRIGGER IF EXISTS update_broadcast_messages_updated_at ON broadcast_messages;
CREATE TRIGGER update_broadcast_messages_updated_at
    BEFORE UPDATE ON broadcast_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- store_imagesテーブル
DROP TRIGGER IF EXISTS update_store_images_updated_at ON store_images;
CREATE TRIGGER update_store_images_updated_at
    BEFORE UPDATE ON store_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- store_messagesテーブル
DROP TRIGGER IF EXISTS update_store_messages_updated_at ON store_messages;
CREATE TRIGGER update_store_messages_updated_at
    BEFORE UPDATE ON store_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- store_owner_notesテーブル
DROP TRIGGER IF EXISTS update_store_owner_notes_updated_at ON store_owner_notes;
CREATE TRIGGER update_store_owner_notes_updated_at
    BEFORE UPDATE ON store_owner_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- favorite_storesテーブル
DROP TRIGGER IF EXISTS update_favorite_stores_updated_at ON favorite_stores;
CREATE TRIGGER update_favorite_stores_updated_at
    BEFORE UPDATE ON favorite_stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- jobsテーブル
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- admin_usersテーブル
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. 追加のインデックス
-- ============================================================================

-- お気に入り関連
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_store_id ON favorites(store_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stores_store_id ON favorite_stores(store_id);
CREATE INDEX IF NOT EXISTS idx_favorite_stores_user_id ON favorite_stores(user_id);

-- 訪問履歴関連
CREATE INDEX IF NOT EXISTS idx_visited_stores_user_id ON visited_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_stores_store_id ON visited_stores(store_id);
CREATE INDEX IF NOT EXISTS idx_visited_stores_visited_at ON visited_stores(visited_at);

-- ユーザーメッセージ関連
CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_message_id ON user_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_is_read ON user_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_user_store_message_reads_user_id ON user_store_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_store_message_reads_store_message_id ON user_store_message_reads(store_message_id);

-- ============================================================================
-- 6. Row Level Security (RLS) ポリシー
-- ============================================================================

-- RLSを有効化（まだ有効化されていない場合）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE visited_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE cast_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_images ENABLE ROW LEVEL SECURITY;

-- 基本的な読み取りポリシー（公開情報）
CREATE POLICY IF NOT EXISTS "Allow public read for stores" ON stores
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read for cast_profiles" ON cast_profiles
    FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Allow public read for store_messages" ON store_messages
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read for store_images" ON store_images
    FOR SELECT USING (true);

-- ============================================================================
-- 7. データ型と列挙型の作成（必要に応じて）
-- ============================================================================

-- メッセージステータス
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('draft', 'sent', 'delivered', 'read', 'failed');
    END IF;
END $$;

-- レビューステータス
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'deleted');
    END IF;
END $$;

-- 申請ステータス
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
        CREATE TYPE application_status AS ENUM ('pending', 'reviewing', 'approved', 'rejected', 'withdrawn');
    END IF;
END $$;

-- ============================================================================
-- コメントの追加（ドキュメント化）
-- ============================================================================

COMMENT ON TABLE users IS 'ユーザー基本情報テーブル';
COMMENT ON TABLE profiles IS 'ユーザープロフィール詳細';
COMMENT ON TABLE favorites IS 'ユーザーのお気に入り店舗';
COMMENT ON TABLE favorite_stores IS '店舗側で管理するお気に入りユーザー';
COMMENT ON TABLE visited_stores IS '店舗訪問履歴';
COMMENT ON TABLE cast_profiles IS 'キャストプロフィール';
COMMENT ON TABLE guest_profiles IS 'ゲストプロフィール';
COMMENT ON TABLE message_threads IS 'メッセージスレッド管理';
COMMENT ON TABLE message_templates IS 'メッセージテンプレート';
COMMENT ON TABLE message_cancellations IS 'メッセージキャンセル履歴';
COMMENT ON TABLE broadcast_messages IS '一斉送信メッセージ';
COMMENT ON TABLE broadcast_recipients IS '一斉送信の受信者管理';
COMMENT ON TABLE notification_reads IS '通知既読管理';
COMMENT ON TABLE review_helpfuls IS 'レビューの役に立った評価';
COMMENT ON TABLE review_reports IS 'レビュー通報';
COMMENT ON TABLE review_deletion_requests IS 'レビュー削除申請';
COMMENT ON TABLE store_images IS '店舗画像管理';
COMMENT ON TABLE store_messages IS '店舗からのメッセージ';
COMMENT ON TABLE store_owner_notes IS '店舗オーナーのメモ';
COMMENT ON TABLE store_edit_history IS '店舗情報編集履歴';
COMMENT ON TABLE store_view_tracking IS '店舗閲覧追跡';
COMMENT ON TABLE jobs IS '求人情報';
COMMENT ON TABLE applications IS '求人応募';
COMMENT ON TABLE user_messages IS 'ユーザー別メッセージ管理';
COMMENT ON TABLE user_store_message_reads IS 'ユーザーの店舗メッセージ既読管理';
COMMENT ON TABLE admin_users IS 'レガシー管理者テーブル';

-- ============================================================================
-- 実行完了メッセージ
-- ============================================================================
-- Part 3 完了: 関連テーブルと外部キー制約の作成が完了しました
--
-- 全3パートのマイグレーションが完了しました！
--
-- 次のステップ:
-- 1. 各SQLファイルをSupabase SQLエディタで順番に実行
-- 2. エラーがないことを確認
-- 3. 必要に応じてデータ移行スクリプトを実行
-- ============================================================================