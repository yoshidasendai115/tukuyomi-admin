const { createClient } = require('@supabase/supabase-js');

// リモート（本番環境）のSupabase設定
const REMOTE_URL = 'https://okntsiwxrgwabsemuxsq.supabase.co';
const REMOTE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbnRzaXd4cmd3YWJzZW11eHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI1NjE0MiwiZXhwIjoyMDY0ODMyMTQyfQ.GlBkewtZ6F4HRApitc9_oNiWexBL6oHqLnFxdgM1T2Q';

const remoteSupabase = createClient(REMOTE_URL, REMOTE_SERVICE_ROLE_KEY);

async function applySchemaChanges() {
  console.log('🔧 Applying schema changes to remote database...\n');

  const changes = [
    {
      name: 'Add railway_lines to areas',
      sql: `ALTER TABLE areas ADD COLUMN IF NOT EXISTS railway_lines jsonb;`
    },
    {
      name: 'Add line_orders to areas',
      sql: `ALTER TABLE areas ADD COLUMN IF NOT EXISTS line_orders jsonb;`
    },
    {
      name: 'Add contact_phone_for_ga to stores',
      sql: `ALTER TABLE stores ADD COLUMN IF NOT EXISTS contact_phone_for_ga text;`
    },
    {
      name: 'Add is_recommended to stores',
      sql: `ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_recommended boolean DEFAULT false;`
    },
    {
      name: 'Add hours columns to stores',
      sql: `
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
      `
    },
    {
      name: 'Add is_cancelled to messages',
      sql: `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_cancelled boolean DEFAULT false;`
    },
    {
      name: 'Create users table',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text UNIQUE,
          phone text,
          name text,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );
      `
    },
    {
      name: 'Create favorites table',
      sql: `
        CREATE TABLE IF NOT EXISTS favorites (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
          created_at timestamp with time zone DEFAULT now(),
          UNIQUE(user_id, store_id)
        );
      `
    },
    {
      name: 'Create user_messages table',
      sql: `
        CREATE TABLE IF NOT EXISTS user_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
          is_read boolean DEFAULT false,
          read_at timestamp with time zone,
          created_at timestamp with time zone DEFAULT now(),
          UNIQUE(user_id, message_id)
        );
      `
    },
    {
      name: 'Create admin_store_edit_requests table',
      sql: `
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
      `
    },
    {
      name: 'Create admin_store_edit_tokens table',
      sql: `
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
      `
    },
    {
      name: 'Create admin_store_edit_credentials table',
      sql: `
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
      `
    },
    {
      name: 'Create admin_store_edit_sessions table',
      sql: `
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
      `
    },
    {
      name: 'Create admin_store_edit_auth_logs table',
      sql: `
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
      `
    },
    {
      name: 'Create message_threads table',
      sql: `
        CREATE TABLE IF NOT EXISTS message_threads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now()
        );
      `
    }
  ];

  for (const change of changes) {
    console.log(`📋 ${change.name}...`);
    try {
      const { error } = await remoteSupabase.rpc('exec_sql', { sql: change.sql });

      if (error) {
        console.error(`❌ Error: ${error.message}`);
      } else {
        console.log(`✅ Success`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
  }

  console.log('\n✨ Schema changes completed');
}

applySchemaChanges().catch(console.error);