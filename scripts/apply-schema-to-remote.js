const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.production' });

// リモート（本番環境）のSupabase設定 - garunaviプロジェクト
const REMOTE_URL = 'https://aexizormxwwoyermbhfr.supabase.co';
const REMOTE_SERVICE_ROLE_KEY = 'YOUR_NEW_SERVICE_ROLE_KEY_HERE'; // TODO: garunaviプロジェクトのservice_roleキーに置き換える

// クライアントの初期化
const supabase = createClient(REMOTE_URL, REMOTE_SERVICE_ROLE_KEY);

async function checkTables() {
  console.log('📍 Checking existing tables in remote database...');

  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN (
      'admin_access_logs',
      'admin_auth_users',
      'admin_store_edit_auth_logs',
      'admin_store_edit_credentials',
      'admin_store_edit_requests',
      'admin_store_edit_sessions',
      'admin_store_edit_tokens'
    )
    ORDER BY table_name;
  `;

  const { data, error } = await supabase.rpc('query_raw', { sql: query }).single();

  if (error) {
    // rpc関数が存在しない場合は、直接SQLを実行
    console.log('⚠️ Cannot use query_raw RPC, will apply migration directly');
    return [];
  }

  return data || [];
}

async function applyMigration() {
  console.log('🚀 Applying schema migration to remote Supabase...');
  console.log(`📍 Remote: ${REMOTE_URL}`);

  try {
    // 既存のテーブルを確認
    const existingTables = await checkTables();

    if (existingTables.length > 0) {
      console.log('⚠️ Found existing admin tables in remote database:');
      existingTables.forEach(table => console.log(`  - ${table.table_name}`));
      console.log('\n⛔ Migration stopped to prevent data loss.');
      console.log('📝 These tables already exist in the remote database.');
      return;
    }

    // マイグレーションファイルを読み込み
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250928_add_missing_columns.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded successfully');
    console.log('📝 Tables to be created:');
    console.log('  - admin_access_logs');
    console.log('  - admin_auth_users');
    console.log('  - admin_store_edit_auth_logs');
    console.log('  - admin_store_edit_credentials');
    console.log('  - admin_store_edit_requests');
    console.log('  - admin_store_edit_sessions');
    console.log('  - admin_store_edit_tokens');

    // SQLを個別のステートメントに分割
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📊 Found ${statements.length} SQL statements to execute`);

    // 各ステートメントを実行
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';

      // CREATE TABLE文の場合はテーブル名を抽出
      const tableMatch = statement.match(/CREATE TABLE (\w+)/i);
      const tableName = tableMatch ? tableMatch[1] : `Statement ${i + 1}`;

      try {
        // Supabase JavaScriptクライアントでは直接SQL実行ができないため、
        // 管理者APIを使用するか、Supabase Dashboardから実行する必要があります
        console.log(`\n⚠️ Cannot execute DDL statements directly via JavaScript client.`);
        console.log(`📝 Please execute the following migration file manually in Supabase Dashboard:`);
        console.log(`   ${migrationPath}`);
        console.log(`\n📌 Steps:`);
        console.log(`   1. Go to https://supabase.com/dashboard/project/aexizormxwwoyermbhfr/sql/new`);
        console.log(`   2. Copy and paste the contents of the migration file`);
        console.log(`   3. Click "Run" to execute the migration`);

        return;
      } catch (error) {
        console.error(`❌ Error executing ${tableName}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);

    if (errorCount === 0) {
      console.log('\n✨ Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with errors. Please review the output above.');
    }

  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  }
}

// 実行
applyMigration().catch(console.error);