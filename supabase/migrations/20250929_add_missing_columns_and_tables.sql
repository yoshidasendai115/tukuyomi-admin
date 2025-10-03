-- stationsテーブルに不足しているカラムを追加
ALTER TABLE stations ADD COLUMN IF NOT EXISTS railway_lines jsonb;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS line_orders jsonb;

-- storesテーブルに不足しているカラムを追加
ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone_for_ga text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false;
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS hours_monday_open time,
ADD COLUMN IF NOT EXISTS hours_monday_close time,
ADD COLUMN IF NOT EXISTS hours_monday_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_tuesday_open time,
ADD COLUMN IF NOT EXISTS hours_tuesday_close time,
ADD COLUMN IF NOT EXISTS hours_tuesday_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_wednesday_open time,
ADD COLUMN IF NOT EXISTS hours_wednesday_close time,
ADD COLUMN IF NOT EXISTS hours_wednesday_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_thursday_open time,
ADD COLUMN IF NOT EXISTS hours_thursday_close time,
ADD COLUMN IF NOT EXISTS hours_thursday_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_friday_open time,
ADD COLUMN IF NOT EXISTS hours_friday_close time,
ADD COLUMN IF NOT EXISTS hours_friday_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_saturday_open time,
ADD COLUMN IF NOT EXISTS hours_saturday_close time,
ADD COLUMN IF NOT EXISTS hours_saturday_closed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hours_sunday_open time,
ADD COLUMN IF NOT EXISTS hours_sunday_close time,
ADD COLUMN IF NOT EXISTS hours_sunday_closed boolean DEFAULT false;

-- messagesテーブルに不足しているカラムを追加
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;

-- usersテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    phone text,
    name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- favoritesテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, store_id)
);

-- user_messagesテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS user_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, message_id)
);

-- message_threadsテーブルを作成（messagesテーブルの前に作成）
CREATE TABLE IF NOT EXISTS message_threads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 管理系テーブルを作成
CREATE TABLE IF NOT EXISTS admin_store_edit_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name text NOT NULL,
    contact_email text NOT NULL,
    contact_phone text,
    requested_at timestamp with time zone DEFAULT now(),
    approved_at timestamp with time zone,
    approved_by uuid,
    status text DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS admin_store_edit_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES admin_store_edit_requests(id) ON DELETE CASCADE,
    store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
    token text UNIQUE NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    max_uses integer DEFAULT 100,
    use_count integer DEFAULT 0,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_store_edit_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    email text NOT NULL,
    password_hash text NOT NULL,
    require_auth boolean DEFAULT false,
    is_active boolean DEFAULT true,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(token_id, email)
);

CREATE TABLE IF NOT EXISTS admin_store_edit_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    credential_id uuid REFERENCES admin_store_edit_credentials(id) ON DELETE CASCADE,
    session_token text UNIQUE NOT NULL,
    ip_address text,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_store_edit_auth_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id uuid REFERENCES admin_store_edit_tokens(id) ON DELETE CASCADE,
    credential_id uuid REFERENCES admin_store_edit_credentials(id),
    action text NOT NULL,
    email text,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);