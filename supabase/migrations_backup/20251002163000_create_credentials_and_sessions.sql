-- ================================================
-- Create admin_store_edit_credentials and admin_store_edit_sessions tables
-- ================================================

-- 1. Create admin_store_edit_credentials table
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

-- 2. Create admin_store_edit_sessions table
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

-- 3. Create admin_store_edit_auth_logs table (optional, but often used with credentials)
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

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_credentials_token_id ON admin_store_edit_credentials(token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_credentials_email ON admin_store_edit_credentials(email);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_token_id ON admin_store_edit_sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_credential_id ON admin_store_edit_sessions(credential_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_session_token ON admin_store_edit_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_auth_logs_token_id ON admin_store_edit_auth_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_auth_logs_created_at ON admin_store_edit_auth_logs(created_at DESC);
