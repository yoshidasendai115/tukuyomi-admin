-- ============================================================================
-- Part 2: 基本テーブルの作成
-- 安全なマイグレーション：既存データを削除せずに新規テーブルを作成
-- ============================================================================

-- ============================================================================
-- 1. ユーザー関連テーブル
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

-- cast_profilesテーブル（キャストのプロフィール）
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
-- 2. メッセージ・通知関連テーブル
-- ============================================================================

-- message_threadsテーブル（メッセージスレッド）
CREATE TABLE IF NOT EXISTS message_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    last_message_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- message_templatesテーブル（メッセージテンプレート）
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

-- message_cancellationsテーブル（メッセージキャンセル履歴）
CREATE TABLE IF NOT EXISTS message_cancellations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    cancelled_by uuid,
    reason text,
    cancelled_at timestamp with time zone DEFAULT now()
);

-- broadcast_messagesテーブル（一斉送信メッセージ）
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

-- broadcast_recipientsテーブル（一斉送信の受信者）
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_message_id uuid REFERENCES broadcast_messages(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- notification_readsテーブル（通知既読管理）
CREATE TABLE IF NOT EXISTS notification_reads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    read_at timestamp with time zone DEFAULT now(),
    UNIQUE(notification_id, user_id)
);

-- ============================================================================
-- 3. レビュー関連テーブル
-- ============================================================================

-- review_helpfulsテーブル（レビューの「役に立った」）
CREATE TABLE IF NOT EXISTS review_helpfuls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    is_helpful boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(review_id, user_id)
);

-- review_reportsテーブル（レビューの通報）
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

-- review_deletion_requestsテーブル（レビュー削除申請）
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

-- ============================================================================
-- 4. 店舗関連テーブル
-- ============================================================================

-- store_imagesテーブル（店舗画像管理）
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

-- store_messagesテーブル（店舗からのメッセージ）
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

-- store_owner_notesテーブル（店舗オーナーのメモ）
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

-- store_edit_historyテーブル（店舗編集履歴）
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

-- store_view_trackingテーブル（店舗閲覧追跡）
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

-- ============================================================================
-- 5. 求人関連テーブル
-- ============================================================================

-- jobsテーブル（求人情報）
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

-- applicationsテーブル（求人応募）
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

-- ============================================================================
-- 6. その他のテーブル
-- ============================================================================

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
-- インデックスの作成
-- ============================================================================

-- users関連
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- profiles関連
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cast_profiles_store_id ON cast_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_user_id ON guest_profiles(user_id);

-- messages関連
CREATE INDEX IF NOT EXISTS idx_message_threads_store_id ON message_threads(store_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_user_id ON message_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_store_id ON message_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_store_id ON broadcast_messages(store_id);

-- reviews関連
CREATE INDEX IF NOT EXISTS idx_review_helpfuls_review_id ON review_helpfuls(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review_id ON review_reports(review_id);
CREATE INDEX IF NOT EXISTS idx_review_deletion_requests_review_id ON review_deletion_requests(review_id);

-- stores関連
CREATE INDEX IF NOT EXISTS idx_store_images_store_id ON store_images(store_id);
CREATE INDEX IF NOT EXISTS idx_store_messages_store_id ON store_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_store_owner_notes_store_id ON store_owner_notes(store_id);
CREATE INDEX IF NOT EXISTS idx_store_edit_history_store_id ON store_edit_history(store_id);
CREATE INDEX IF NOT EXISTS idx_store_view_tracking_store_id ON store_view_tracking(store_id);

-- jobs関連
CREATE INDEX IF NOT EXISTS idx_jobs_store_id ON jobs(store_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_store_id ON applications(store_id);

-- ============================================================================
-- 実行完了メッセージ
-- ============================================================================
-- Part 2 完了: 基本テーブルの作成が完了しました
-- 次は Part 3 を実行してください