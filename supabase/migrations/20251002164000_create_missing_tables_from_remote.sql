-- ================================================
-- Create missing tables that exist in remote but not in local
-- Tables: admin_users, broadcast_messages, broadcast_recipients, favorites,
--         message_cancellations, message_templates, user_messages, users
-- ================================================

-- 1. admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'admin',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. broadcast_messages table
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    store_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    target_criteria jsonb,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    status text DEFAULT 'draft',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. broadcast_recipients table
CREATE TABLE IF NOT EXISTS broadcast_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    broadcast_message_id uuid,
    user_id uuid,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    store_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. message_cancellations table
CREATE TABLE IF NOT EXISTS message_cancellations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    message_id uuid,
    store_id uuid,
    cancelled_by uuid,
    reason text,
    cancelled_at timestamp with time zone DEFAULT now()
);

-- 6. message_templates table
CREATE TABLE IF NOT EXISTS message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    store_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    category text,
    is_active boolean DEFAULT true,
    use_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 7. user_messages table
CREATE TABLE IF NOT EXISTS user_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    message_id uuid,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_starred boolean DEFAULT false,
    is_archived boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 8. users table
CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text,
    phone text,
    name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_store_id ON broadcast_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast_message_id ON broadcast_recipients(broadcast_message_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_user_id ON broadcast_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_store_id ON favorites(store_id);
CREATE INDEX IF NOT EXISTS idx_message_cancellations_message_id ON message_cancellations(message_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_store_id ON message_templates(store_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_message_id ON user_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
