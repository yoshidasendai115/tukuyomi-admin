-- ================================================
-- Create missing admin tables for local development
-- This migration safely creates tables that may not exist
-- ================================================

-- 1. Create admin_store_edit_requests table if not exists
CREATE TABLE IF NOT EXISTS admin_store_edit_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name text NOT NULL,
    store_address text NOT NULL,
    store_phone text NOT NULL,
    applicant_name text NOT NULL,
    applicant_email text NOT NULL,
    applicant_phone text NOT NULL,
    applicant_role text NOT NULL,
    business_license text,
    additional_info text,
    status text CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')) DEFAULT 'pending',
    admin_notes text,
    rejection_reason text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    -- Document verification fields
    document_type text,
    business_license_image text,
    additional_document_type text,
    additional_document_image text,
    identity_document_image text,
    license_holder_name text,
    applicant_relationship text,
    document_verification_status text DEFAULT 'pending',
    verification_notes text,
    business_type text,
    store_id uuid,
    token text,
    generated_url text
);

-- 2. Create admin_store_edit_tokens table if not exists
CREATE TABLE IF NOT EXISTS admin_store_edit_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES admin_store_edit_requests(id) ON DELETE CASCADE,
    store_id uuid, -- Nullable to avoid foreign key issues with missing stores table
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

-- 3. Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_status ON admin_store_edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_requests_created_at ON admin_store_edit_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_tokens_token ON admin_store_edit_tokens(token);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_tokens_expires_at ON admin_store_edit_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_store_edit_tokens_is_active ON admin_store_edit_tokens(is_active);
