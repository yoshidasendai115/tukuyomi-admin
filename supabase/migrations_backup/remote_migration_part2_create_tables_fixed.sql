-- ============================================================================
-- Part 2: 基本テーブルの作成（修正版）
-- 安全なマイグレーション：既存データを削除せずに新規テーブルを作成
-- 依存関係の順序を考慮して実行
-- ============================================================================

-- ============================================================================
-- 1. 独立したテーブル（外部キー依存なし）を最初に作成
-- ============================================================================

-- usersテーブル（基本的なユーザー情報）
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    phone text,
    name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- admin_usersテーブル（レガシー管理者テーブル）
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'admin',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- 2. usersテーブルに依存するテーブル
-- ============================================================================

-- profilesテーブル（ユーザーのプロフィール情報）
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    display_name text,
    avatar_url text,
    bio text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- guest_profilesテーブル（ゲストのプロフィール）
CREATE TABLE IF NOT EXISTS guest_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    nickname text,
    age_range text,
    preferences jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- 3. stores/users両方に依存するテーブル
-- ============================================================================

-- message_threadsテーブル（メッセージスレッド）
-- storesテーブルが存在する前提で作成
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS message_threads (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            user_id uuid REFERENCES users(id) ON DELETE CASCADE,
            last_message_at timestamp with time zone,
            is_active boolean DEFAULT true,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- ============================================================================
-- 4. storesテーブルに依存するテーブル（storesが存在する場合のみ作成）
-- ============================================================================

-- cast_profilesテーブル（キャストのプロフィール）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS cast_profiles (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            name text NOT NULL,
            age integer,
            height integer,
            blood_type text,
            personality text,
            hobbies text[],
            image_url text,
            is_active boolean DEFAULT true,
            display_order integer,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- message_templatesテーブル（メッセージテンプレート）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS message_templates (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            title text NOT NULL,
            content text NOT NULL,
            category text,
            is_active boolean DEFAULT true,
            use_count integer DEFAULT 0,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- broadcast_messagesテーブル（一斉送信メッセージ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS broadcast_messages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            title text NOT NULL,
            content text NOT NULL,
            target_criteria jsonb,
            scheduled_at timestamp with time zone,
            sent_at timestamp with time zone,
            status text DEFAULT 'draft',
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- store_imagesテーブル（店舗画像管理）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS store_images (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            image_url text NOT NULL,
            caption text,
            category text,
            display_order integer,
            is_primary boolean DEFAULT false,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- store_messagesテーブル（店舗からのメッセージ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS store_messages (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            title text,
            content text NOT NULL,
            category text,
            is_pinned boolean DEFAULT false,
            expires_at timestamp with time zone,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- store_owner_notesテーブル（店舗オーナーのメモ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS store_owner_notes (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            note text NOT NULL,
            category text,
            is_private boolean DEFAULT true,
            created_by uuid,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- store_edit_historyテーブル（店舗編集履歴）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS store_edit_history (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            edited_by uuid,
            changes jsonb NOT NULL,
            edit_type text,
            ip_address text,
            user_agent text,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- store_view_trackingテーブル（店舗閲覧追跡）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS store_view_tracking (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            user_id uuid REFERENCES users(id) ON DELETE SET NULL,
            session_id text,
            ip_address text,
            user_agent text,
            referrer text,
            viewed_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- jobsテーブル（求人情報）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE IF NOT EXISTS jobs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            title text NOT NULL,
            description text,
            employment_type text,
            salary_range text,
            working_hours text,
            requirements text[],
            benefits text[],
            is_active boolean DEFAULT true,
            expires_at timestamp with time zone,
            created_at timestamp with time zone DEFAULT now(),
            updated_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- ============================================================================
-- 5. 他のテーブルに依存するテーブル
-- ============================================================================

-- broadcast_recipientsテーブル（broadcast_messagesが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_messages') THEN
        CREATE TABLE IF NOT EXISTS broadcast_recipients (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            broadcast_message_id uuid REFERENCES broadcast_messages(id) ON DELETE CASCADE,
            user_id uuid REFERENCES users(id) ON DELETE CASCADE,
            is_read boolean DEFAULT false,
            read_at timestamp with time zone,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- notification_readsテーブル（notificationsが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE IF NOT EXISTS notification_reads (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
            user_id uuid REFERENCES users(id) ON DELETE CASCADE,
            read_at timestamp with time zone DEFAULT now(),
            UNIQUE(notification_id, user_id)
        );
    END IF;
END $$;

-- applicationsテーブル（jobsが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        CREATE TABLE IF NOT EXISTS applications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            applicant_name text NOT NULL,
            applicant_email text,
            applicant_phone text,
            message text,
            resume_url text,
            status text DEFAULT 'pending',
            reviewed_at timestamp with time zone,
            reviewed_by uuid,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- ============================================================================
-- 6. messagesテーブルに依存するテーブル
-- ============================================================================

-- message_cancellationsテーブル（messagesが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        CREATE TABLE IF NOT EXISTS message_cancellations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
            store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
            cancelled_by uuid,
            reason text,
            cancelled_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- ============================================================================
-- 7. reviewsテーブルに依存するテーブル
-- ============================================================================

-- review_helpfulsテーブル（reviewsが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TABLE IF NOT EXISTS review_helpfuls (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
            user_id uuid REFERENCES users(id) ON DELETE CASCADE,
            is_helpful boolean DEFAULT true,
            created_at timestamp with time zone DEFAULT now(),
            UNIQUE(review_id, user_id)
        );
    END IF;
END $$;

-- review_reportsテーブル（reviewsが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TABLE IF NOT EXISTS review_reports (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
            reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
            reason text NOT NULL,
            details text,
            status text DEFAULT 'pending',
            reviewed_at timestamp with time zone,
            reviewed_by uuid,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- review_deletion_requestsテーブル（reviewsが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE TABLE IF NOT EXISTS review_deletion_requests (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
            requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
            reason text NOT NULL,
            status text DEFAULT 'pending',
            admin_notes text,
            processed_at timestamp with time zone,
            processed_by uuid,
            created_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- ============================================================================
-- インデックスの作成（テーブルが存在する場合のみ）
-- ============================================================================

-- users関連
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- profiles関連
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cast_profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_cast_profiles_store_id ON cast_profiles(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guest_profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_guest_profiles_user_id ON guest_profiles(user_id);
    END IF;
END $$;

-- messages関連
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_threads') THEN
        CREATE INDEX IF NOT EXISTS idx_message_threads_store_id ON message_threads(store_id);
        CREATE INDEX IF NOT EXISTS idx_message_threads_user_id ON message_threads(user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'message_templates') THEN
        CREATE INDEX IF NOT EXISTS idx_message_templates_store_id ON message_templates(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_messages') THEN
        CREATE INDEX IF NOT EXISTS idx_broadcast_messages_store_id ON broadcast_messages(store_id);
    END IF;
END $$;

-- stores関連
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_images') THEN
        CREATE INDEX IF NOT EXISTS idx_store_images_store_id ON store_images(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_messages') THEN
        CREATE INDEX IF NOT EXISTS idx_store_messages_store_id ON store_messages(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_owner_notes') THEN
        CREATE INDEX IF NOT EXISTS idx_store_owner_notes_store_id ON store_owner_notes(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_edit_history') THEN
        CREATE INDEX IF NOT EXISTS idx_store_edit_history_store_id ON store_edit_history(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_view_tracking') THEN
        CREATE INDEX IF NOT EXISTS idx_store_view_tracking_store_id ON store_view_tracking(store_id);
    END IF;
END $$;

-- jobs関連
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        CREATE INDEX IF NOT EXISTS idx_jobs_store_id ON jobs(store_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
        CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
        CREATE INDEX IF NOT EXISTS idx_applications_store_id ON applications(store_id);
    END IF;
END $$;

-- reviews関連
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_helpfuls') THEN
        CREATE INDEX IF NOT EXISTS idx_review_helpfuls_review_id ON review_helpfuls(review_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_reports') THEN
        CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_deletion_requests') THEN
        CREATE INDEX IF NOT EXISTS idx_review_deletion_requests_review_id ON review_deletion_requests(review_id);
    END IF;
END $$;

-- ============================================================================
-- 実行完了メッセージ
-- ============================================================================
-- Part 2 修正版完了: 基本テーブルの作成が完了しました
--
-- この修正版では：
-- 1. 依存関係の順序を考慮
-- 2. 各テーブル作成前に依存テーブルの存在確認
-- 3. DO $$ ... $$ ブロックで条件付き実行
--
-- 次は Part 3 を実行してください
-- ============================================================================