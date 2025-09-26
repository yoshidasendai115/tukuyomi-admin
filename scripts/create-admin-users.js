/**
 * 管理者ユーザー作成スクリプト
 *
 * 使用方法:
 * 1. .env.localファイルに以下の環境変数を設定:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 2. node scripts/create-admin-users.js を実行
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const adminUsers = [
  {
    email: 'ga-ren@tukuyomi-admin.local',
    password: 'Pass1234@!',
    role: 'super_admin',
    name: 'ga-ren'
  },
  {
    email: 'ys-yoshida@tukuyomi-admin.local',
    password: 'Pass1234@!',
    role: 'super_admin',
    name: 'ys-yoshida'
  }
];

async function createAdminUsers() {
  console.log('🚀 管理者ユーザーの作成を開始します...\n');

  for (const user of adminUsers) {
    console.log(`📝 ユーザー作成中: ${user.email}`);

    try {
      // 1. Supabase Authでユーザーを作成
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          name: user.name
        }
      });

      if (authError) {
        // ユーザーが既に存在する場合はスキップ
        if (authError.message.includes('already been registered')) {
          console.log(`⚠️  ユーザーは既に存在します: ${user.email}`);

          // 既存ユーザーのIDを取得
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
          const foundUser = existingUser?.users?.find(u => u.email === user.email);

          if (foundUser) {
            // admin_usersテーブルにレコードを追加/更新
            await upsertAdminUser(foundUser.id, user.role);
          }
          continue;
        }
        throw authError;
      }

      console.log(`✅ Authユーザー作成成功: ${user.email}`);

      // 2. admin_usersテーブルにレコードを追加
      if (authData.user) {
        await upsertAdminUser(authData.user.id, user.role);
      }

      console.log(`✅ 管理者権限付与成功: ${user.email}\n`);

    } catch (error) {
      console.error(`❌ エラー (${user.email}):`, error.message);
    }
  }

  console.log('\n✨ 管理者ユーザーの作成が完了しました！');
  console.log('\n📋 ログイン情報:');
  adminUsers.forEach(user => {
    console.log(`   ID: ${user.email.split('@')[0]}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${user.password}`);
    console.log('   ---');
  });
  console.log('\n⚠️  セキュリティ上の理由から、初回ログイン後は必ずパスワードを変更してください。');
}

async function upsertAdminUser(userId, role) {
  const { error } = await supabaseAdmin
    .from('admin_users')
    .upsert({
      user_id: userId,
      role: role,
      permissions: { all: true },
      is_active: true
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    throw error;
  }
}

// スクリプトの実行
createAdminUsers().catch(console.error);