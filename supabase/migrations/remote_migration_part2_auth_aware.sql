-- ============================================================================
-- Part 2: 基本テーブルの作成（Auth対応版）
-- 重要：Supabaseのauth.usersを考慮した実装
-- ============================================================================

-- ============================================================================
-- SECTION A: usersテーブルの作成または参照確認
-- ============================================================================

-- publicスキーマにusersテーブルを作成（auth.usersとは別）
-- 注意：storesテーブルのowner_idはauth.usersを参照している可能性がある
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    phone text,
    name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- admin_usersテーブル（レガシー管理者テーブル）
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'admin',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- SECTION B: public.usersテーブルに依存するテーブル
-- ============================================================================

-- profilesテーブル（auth.usersではなくpublic.usersを参照）
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,  -- 外部キー制約なしで作成（後で追加を検討）
    display_name text,
    avatar_url text,
    bio text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- guest_profilesテーブル
CREATE TABLE IF NOT EXISTS public.guest_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,  -- 外部キー制約なしで作成
    nickname text,
    age_range text,
    preferences jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- SECTION C: storesテーブルに依存するテーブル
-- ============================================================================

-- cast_profilesテーブル
CREATE TABLE IF NOT EXISTS public.cast_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
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

-- message_templatesテーブル
CREATE TABLE IF NOT EXISTS public.message_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    category text,
    is_active boolean DEFAULT true,
    use_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- broadcast_messagesテーブル
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    title text NOT NULL,
    content text NOT NULL,
    target_criteria jsonb,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    status text DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- store_imagesテーブル
CREATE TABLE IF NOT EXISTS public.store_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    caption text,
    category text,
    display_order integer,
    is_primary boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- store_messagesテーブル
CREATE TABLE IF NOT EXISTS public.store_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    title text,
    content text NOT NULL,
    category text,
    is_pinned boolean DEFAULT false,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- store_owner_notesテーブル
CREATE TABLE IF NOT EXISTS public.store_owner_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    note text NOT NULL,
    category text,
    is_private boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- store_edit_historyテーブル
CREATE TABLE IF NOT EXISTS public.store_edit_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    edited_by uuid,
    changes jsonb NOT NULL,
    edit_type text,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);

-- store_view_trackingテーブル
CREATE TABLE IF NOT EXISTS public.store_view_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id uuid,  -- 外部キー制約なし
    session_id text,
    ip_address text,
    user_agent text,
    referrer text,
    viewed_at timestamp with time zone DEFAULT now()
);

-- jobsテーブル
CREATE TABLE IF NOT EXISTS public.jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
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

-- ============================================================================
-- SECTION D: 複合依存テーブル
-- ============================================================================

-- message_threadsテーブル
CREATE TABLE IF NOT EXISTS public.message_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id uuid,  -- 外部キー制約なし
    last_message_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- broadcast_recipientsテーブル
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_message_id uuid REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
    user_id uuid,  -- 外部キー制約なし
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- applicationsテーブル
CREATE TABLE IF NOT EXISTS public.applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid REFERENCES public.jobs(id) ON DELETE CASCADE,
    store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
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

-- ============================================================================
-- SECTION E: 既存テーブル依存（条件付き）
-- ============================================================================

-- messagesテーブルに依存
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS public.message_cancellations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
            store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
            cancelled_by uuid,
            reason text,
            cancelled_at timestamp with time zone DEFAULT now()
        );
    END IF;
END $$;

-- notificationsテーブルに依存
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS public.notification_reads (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
            user_id uuid,  -- 外部キー制約なし
            read_at timestamp with time zone DEFAULT now(),
            UNIQUE(notification_id, user_id)
        );
    END IF;
END $$;

-- reviewsテーブルに依存
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews' AND table_schema = 'public') THEN
        CREATE TABLE IF NOT EXISTS public.review_helpfuls (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
            user_id uuid,  -- 外部キー制約なし
            is_helpful boolean DEFAULT true,
            created_at timestamp with time zone DEFAULT now(),
            UNIQUE(review_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS public.review_reports (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
            reporter_id uuid,  -- 外部キー制約なし
            reason text NOT NULL,
            details text,
            status text DEFAULT 'pending',
            reviewed_at timestamp with time zone,
            reviewed_by uuid,
            created_at timestamp with time zone DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS public.review_deletion_requests (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
            requested_by uuid,  -- 外部キー制約なし
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
-- SECTION F: インデックスの作成
-- ============================================================================

-- 基本インデックス
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_user_id ON public.guest_profiles(user_id);

-- stores関連インデックス
CREATE INDEX IF NOT EXISTS idx_cast_profiles_store_id ON public.cast_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_store_id ON public.message_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_store_id ON public.broadcast_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_store_images_store_id ON public.store_images(store_id);
CREATE INDEX IF NOT EXISTS idx_store_messages_store_id ON public.store_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_store_owner_notes_store_id ON public.store_owner_notes(store_id);
CREATE INDEX IF NOT EXISTS idx_store_edit_history_store_id ON public.store_edit_history(store_id);
CREATE INDEX IF NOT EXISTS idx_store_view_tracking_store_id ON public.store_view_tracking(store_id);
CREATE INDEX IF NOT EXISTS idx_jobs_store_id ON public.jobs(store_id);

-- 複合テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_message_threads_store_id ON public.message_threads(store_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_user_id ON public.message_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_store_id ON public.applications(store_id);

-- ============================================================================
-- 実行完了メッセージ
-- ============================================================================
-- Part 2 Auth対応版完了: 基本テーブルの作成が完了しました
--
-- 重要な変更点：
-- 1. public.usersテーブルを作成（auth.usersとは別）
-- 2. user_idの外部キー制約を緩和（後で必要に応じて追加可能）
-- 3. すべてのテーブルにpublicスキーマを明示
--
-- 次は Part 3 を実行してください
-- ============================================================================