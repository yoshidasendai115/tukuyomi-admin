const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

// リモート（本番環境）のSupabase設定
const REMOTE_URL = 'https://okntsiwxrgwabsemuxsq.supabase.co';
const REMOTE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rbnRzaXd4cmd3YWJzZW11eHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI1NjE0MiwiZXhwIjoyMDY0ODMyMTQyfQ.GlBkewtZ6F4HRApitc9_oNiWexBL6oHqLnFxdgM1T2Q';

// ローカルのSupabase設定
const LOCAL_URL = 'http://localhost:54321';
const LOCAL_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// クライアントの初期化
const remoteSupabase = createClient(REMOTE_URL, REMOTE_SERVICE_ROLE_KEY);
const localSupabase = createClient(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY);

// バッチサイズ
const BATCH_SIZE = 50;

async function migrateTable(tableName, skipColumns = []) {
  console.log(`\n📋 Migrating table: ${tableName}`);

  try {
    // ローカルからデータ取得
    const { data: localData, error: fetchError } = await localSupabase
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.error(`❌ Error fetching from ${tableName}:`, fetchError.message);
      return { success: false, count: 0, error: fetchError.message };
    }

    if (!localData || localData.length === 0) {
      console.log(`⚠️ No data found in local ${tableName}`);
      return { success: true, count: 0 };
    }

    console.log(`📊 Found ${localData.length} records in local ${tableName}`);

    // リモートの既存データを削除（クリーンマイグレーション）
    console.log(`🗑️ Cleaning remote ${tableName}...`);
    const { error: deleteError } = await remoteSupabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // すべて削除

    if (deleteError) {
      console.error(`❌ Error cleaning remote ${tableName}:`, deleteError.message);
      // 削除エラーは無視して続行
    }

    // データを整形（不要なカラムを除去）
    const cleanedData = localData.map(item => {
      const cleaned = { ...item };
      skipColumns.forEach(col => delete cleaned[col]);
      return cleaned;
    });

    // バッチ処理でデータ挿入
    let successCount = 0;
    for (let i = 0; i < cleanedData.length; i += BATCH_SIZE) {
      const batch = cleanedData.slice(i, i + BATCH_SIZE);

      const { error: insertError } = await remoteSupabase
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.error(`❌ Error inserting batch ${i}-${i + batch.length} into ${tableName}:`, insertError.message);
        // エラーの詳細を表示
        if (insertError.details) {
          console.error('Error details:', insertError.details);
        }
      } else {
        successCount += batch.length;
        console.log(`✅ Inserted batch ${i + 1}-${i + batch.length} into ${tableName}`);
      }
    }

    console.log(`✅ Successfully migrated ${successCount}/${localData.length} records to ${tableName}`);
    return { success: true, count: successCount };

  } catch (error) {
    console.error(`❌ Unexpected error migrating ${tableName}:`, error);
    return { success: false, count: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting data migration from local to remote Supabase...');
  console.log(`📍 Local: ${LOCAL_URL}`);
  console.log(`📍 Remote: ${REMOTE_URL}`);

  const results = {};

  // 依存関係の順序でテーブルを移行
  const tables = [
    // 1. マスターテーブル（依存なし）
    { name: 'areas', skipColumns: ['railway_lines', 'line_orders'] },
    { name: 'genres', skipColumns: [] },
    { name: 'station_groups', skipColumns: [] },

    // 2. メインテーブル（マスターテーブルに依存）
    { name: 'stores', skipColumns: ['contact_phone_for_ga', 'is_recommended', 'priority_score', 'recommendation_reason', 'recommended_at', 'recommended_by',
                                     'hours_monday_open', 'hours_monday_close', 'hours_monday_closed',
                                     'hours_tuesday_open', 'hours_tuesday_close', 'hours_tuesday_closed',
                                     'hours_wednesday_open', 'hours_wednesday_close', 'hours_wednesday_closed',
                                     'hours_thursday_open', 'hours_thursday_close', 'hours_thursday_closed',
                                     'hours_friday_open', 'hours_friday_close', 'hours_friday_closed',
                                     'hours_saturday_open', 'hours_saturday_close', 'hours_saturday_closed',
                                     'hours_sunday_open', 'hours_sunday_close', 'hours_sunday_closed'] },
    { name: 'users', skipColumns: [] },

    // 3. 関連テーブル（メインテーブルに依存）
    { name: 'station_group_members', skipColumns: [] },
    { name: 'favorites', skipColumns: [] },
    { name: 'reviews', skipColumns: [] },
    { name: 'notifications', skipColumns: [] },
    { name: 'messages', skipColumns: ['is_cancelled', 'thread_id'] },
    { name: 'user_messages', skipColumns: [] },

    // 4. 管理系テーブル
    { name: 'admin_auth_users', skipColumns: [] },
    // { name: 'admin_store_edit_requests', skipColumns: [] },
    // { name: 'admin_store_edit_tokens', skipColumns: [] },
    // { name: 'admin_store_edit_credentials', skipColumns: [] },
    // { name: 'admin_store_edit_sessions', skipColumns: [] },
    // { name: 'admin_store_edit_auth_logs', skipColumns: [] },
  ];

  for (const table of tables) {
    results[table.name] = await migrateTable(table.name, table.skipColumns);
  }

  // 結果サマリー
  console.log('\n📊 Migration Summary:');
  console.log('='.repeat(50));

  let totalSuccess = 0;
  let totalRecords = 0;

  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${table}: ${result.count} records`);
    if (result.success) {
      totalSuccess++;
      totalRecords += result.count;
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  console.log('='.repeat(50));
  console.log(`\n✨ Migration completed: ${totalSuccess}/${tables.length} tables`);
  console.log(`📝 Total records migrated: ${totalRecords}`);
}

// 実行
main().catch(console.error);