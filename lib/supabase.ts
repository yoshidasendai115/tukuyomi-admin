import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// 新しいAPI Keyシステムに対応
// Publishable key（旧anon key）をクライアント用に使用
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアント用（通常のアクセス）
export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// サーバー用（管理者権限が必要な操作）
// Secret key（旧service_role key）をサーバー用に使用
const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = secretKey
  ? createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export default supabase;