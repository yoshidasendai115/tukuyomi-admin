const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.production' });

// リモート（本番環境）のSupabase設定
const REMOTE_URL = 'https://okntsiwxrgwabsemuxsq.supabase.co';
const REMOTE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbnRzaXd4cmd3YWJzZW11eHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI1NjE0MiwiZXhwIjoyMDY0ODMyMTQyfQ.GlBkewtZ6F4HRApitc9_oNiWexBL6oHqLnFxdgM1T2Q';

const remoteSupabase = createClient(REMOTE_URL, REMOTE_SERVICE_ROLE_KEY);

async function createAdminTableAndUser() {
  console.log('🚀 Setting up admin_users table and user...\n');

  // まずテーブルの存在を確認
  console.log('📋 Checking if admin_users table exists...');
  const { data: testData, error: testError } = await remoteSupabase
    .from('admin_users')
    .select('id')
    .limit(1);

  if (testError && testError.message.includes('does not exist')) {
    console.log('❌ admin_users table does not exist.');
    console.log('\n📝 Please execute this SQL in Supabase Dashboard:\n');
    console.log(`-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE NOT NULL,
    email text,
    password_hash text NOT NULL,
    is_super_admin boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);`);
    console.log('\n✅ After creating the table, run this script again.');
    return;
  }

  // テーブルが存在する場合、ユーザーを作成
  console.log('✅ admin_users table exists.');
  console.log('\n📋 Creating admin user...');

  const password = 'Pass1234@!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const adminUser = {
    username: 'ys-yoshida',
    email: 'yoshida@yoshidasendai.com',
    password_hash: hashedPassword,
    is_super_admin: true,
    is_active: true
  };

  try {
    const { data, error } = await remoteSupabase
      .from('admin_users')
      .insert([adminUser])
      .select();

    if (error) {
      if (error.message.includes('duplicate key')) {
        console.log('⚠️ User ys-yoshida already exists.');

        // パスワードを更新
        console.log('📋 Updating password for existing user...');
        const { error: updateError } = await remoteSupabase
          .from('admin_users')
          .update({ password_hash: hashedPassword })
          .eq('username', 'ys-yoshida');

        if (updateError) {
          console.log(`❌ Error updating password: ${updateError.message}`);
        } else {
          console.log('✅ Password updated successfully!');
          console.log('\n📝 Login credentials:');
          console.log('   Username: ys-yoshida');
          console.log('   Password: Pass1234@!');
        }
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    } else {
      console.log('✅ Successfully created admin user!');
      console.log('\n📝 Login credentials:');
      console.log('   Username: ys-yoshida');
      console.log('   Password: Pass1234@!');
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  console.log('\n✨ Setup completed');
}

createAdminTableAndUser().catch(console.error);