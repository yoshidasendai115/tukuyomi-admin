-- 安全なマイグレーション：既存データを削除せずにテーブルを作成
-- このファイルはリモート環境に適用するための安全なバージョンです

-- admin_access_logsテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_access_logs(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    action text NOT NULL,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY(id)
);

-- admin_auth_usersテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_auth_users(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    login_id text NOT NULL,
    password_hash text NOT NULL,
    display_name text NOT NULL,
    email text,
    role text DEFAULT 'moderator'::text,
    permissions jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY(id),
    CONSTRAINT admin_auth_users_role_check CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'moderator'::text]))
);

-- admin_auth_usersのインデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS admin_auth_users_login_id_key ON public.admin_auth_users USING btree (login_id);
CREATE INDEX IF NOT EXISTS idx_admin_auth_users_login_id ON public.admin_auth_users USING btree (login_id);
CREATE INDEX IF NOT EXISTS idx_admin_auth_users_is_active ON public.admin_auth_users USING btree (is_active);

-- admin_store_edit_requestsテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_store_edit_requests(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    store_name text NOT NULL,
    store_address text NOT NULL,
    store_phone text NOT NULL,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text NOT NULL,
    applicant_role text NOT NULL,
    business_license text,
    additional_info text,
    status text DEFAULT 'pending'::text,
    admin_notes text,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    processed_by uuid,
    business_type text DEFAULT 'other'::text,
    store_id uuid,
    document_type text DEFAULT 'restaurant_license'::text,
    business_license_image text,
    additional_document_type text,
    additional_document_image text,
    identity_document_image text,
    license_holder_name text,
    applicant_relationship text DEFAULT 'owner'::text,
    document_verification_status text DEFAULT 'pending'::text,
    verification_notes text,
    PRIMARY KEY(id),
    CONSTRAINT admin_store_edit_requests_processed_by_fkey FOREIGN KEY(processed_by) REFERENCES admin_auth_users(id),
    CONSTRAINT admin_store_edit_requests_store_id_fkey FOREIGN KEY(store_id) REFERENCES stores(id),
    CONSTRAINT admin_store_edit_requests_status_check CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'approved'::text, 'rejected'::text])),
    CONSTRAINT admin_store_edit_requests_business_type_check CHECK (business_type = ANY (ARRAY['girls_bar'::text, 'snack'::text, 'concept_cafe'::text, 'other'::text])),
    CONSTRAINT admin_store_edit_requests_document_type_check CHECK (document_type = ANY (ARRAY['restaurant_license'::text, 'late_night_license'::text, 'corporate_registry'::text, 'identity_document'::text])),
    CONSTRAINT admin_store_edit_requests_additional_document_type_check CHECK (additional_document_type = ANY (ARRAY['late_night_license'::text, 'corporate_registry'::text, 'identity_document'::text])),
    CONSTRAINT admin_store_edit_requests_applicant_relationship_check CHECK (applicant_relationship = ANY (ARRAY['owner'::text, 'manager'::text, 'employee'::text, 'representative'::text])),
    CONSTRAINT admin_store_edit_requests_document_verification_status_check CHECK (document_verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text]))
);

-- admin_store_edit_requestsのインデックス作成
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.admin_store_edit_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_requests_created ON public.admin_store_edit_requests USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_business_type ON public.admin_store_edit_requests USING btree (business_type);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_store_id ON public.admin_store_edit_requests USING btree (store_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_document_type ON public.admin_store_edit_requests USING btree (document_type);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_verification_status ON public.admin_store_edit_requests USING btree (document_verification_status);

-- admin_store_edit_tokensテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_store_edit_tokens(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    request_id uuid,
    store_id uuid,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    use_count integer DEFAULT 0,
    max_uses integer DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone,
    PRIMARY KEY(id),
    CONSTRAINT admin_store_edit_tokens_request_id_fkey FOREIGN KEY(request_id) REFERENCES admin_store_edit_requests(id)
);

-- admin_store_edit_tokensのインデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS admin_store_edit_tokens_token_key ON public.admin_store_edit_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_tokens_token ON public.admin_store_edit_tokens USING btree (token);
CREATE INDEX IF NOT EXISTS idx_tokens_expires ON public.admin_store_edit_tokens USING btree (expires_at);

-- admin_store_edit_credentialsテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_store_edit_credentials(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    token_id uuid,
    email text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true,
    require_auth boolean DEFAULT false,
    failed_attempts integer DEFAULT 0,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY(id),
    CONSTRAINT admin_store_edit_credentials_token_id_fkey FOREIGN KEY(token_id) REFERENCES admin_store_edit_tokens(id)
);

-- admin_store_edit_credentialsのインデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS admin_store_edit_credentials_token_id_key ON public.admin_store_edit_credentials USING btree (token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_credentials_token_id ON public.admin_store_edit_credentials USING btree (token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_credentials_email ON public.admin_store_edit_credentials USING btree (email);

-- admin_store_edit_sessionsテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_store_edit_sessions(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    token_id uuid,
    credential_id uuid,
    session_token text NOT NULL,
    ip_address text,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY(id),
    CONSTRAINT admin_store_edit_sessions_token_id_fkey FOREIGN KEY(token_id) REFERENCES admin_store_edit_tokens(id),
    CONSTRAINT admin_store_edit_sessions_credential_id_fkey FOREIGN KEY(credential_id) REFERENCES admin_store_edit_credentials(id)
);

-- admin_store_edit_sessionsのインデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS admin_store_edit_sessions_session_token_key ON public.admin_store_edit_sessions USING btree (session_token);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_token ON public.admin_store_edit_sessions USING btree (session_token);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_sessions_expires_at ON public.admin_store_edit_sessions USING btree (expires_at);

-- admin_store_edit_auth_logsテーブルを作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS admin_store_edit_auth_logs(
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    token_id uuid,
    credential_id uuid,
    action text,
    email text,
    ip_address text,
    user_agent text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY(id),
    CONSTRAINT admin_store_edit_auth_logs_token_id_fkey FOREIGN KEY(token_id) REFERENCES admin_store_edit_tokens(id),
    CONSTRAINT admin_store_edit_auth_logs_credential_id_fkey FOREIGN KEY(credential_id) REFERENCES admin_store_edit_credentials(id),
    CONSTRAINT admin_store_edit_auth_logs_action_check CHECK (action = ANY (ARRAY['login_attempt'::text, 'login_success'::text, 'login_failed'::text, 'logout'::text, 'locked'::text, 'password_changed'::text]))
);

-- admin_store_edit_auth_logsのインデックス作成
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_auth_logs_token_id ON public.admin_store_edit_auth_logs USING btree (token_id);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_auth_logs_created_at ON public.admin_store_edit_auth_logs USING btree (created_at DESC);

-- コメントを追加
COMMENT ON TABLE admin_store_edit_auth_logs IS '店舗編集の認証ログ';
COMMENT ON TABLE admin_store_edit_credentials IS '店舗編集トークンの認証情報';
COMMENT ON COLUMN admin_store_edit_credentials.require_auth IS '認証を必須にするかどうか';
COMMENT ON TABLE admin_store_edit_sessions IS '店舗編集の認証セッション';
COMMENT ON COLUMN admin_store_edit_tokens.last_used_at IS '最終使用日時';

-- 注意：このマイグレーションはデータを削除しません
-- すべての CREATE TABLE と CREATE INDEX には IF NOT EXISTS を使用しています