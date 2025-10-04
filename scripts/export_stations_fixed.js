const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseLocal = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

(async () => {
  console.log('Fetching stations from local Supabase...');

  const { data: stations, error } = await supabaseLocal
    .from('stations')
    .select('*')
    .order('display_order')
    .order('name');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Fetched', stations.length, 'stations');

  // Generate SQL
  let sql = '-- Sync stations data from local to remote Supabase\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';

  sql += '-- Step 1: 不足しているカラムを追加\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS index_letter VARCHAR;\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS latitude NUMERIC;\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS longitude NUMERIC;\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_within_tokyo23 BOOLEAN DEFAULT true;\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS railway_lines TEXT[] DEFAULT \'{}\'::TEXT[];\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS line_orders JSONB DEFAULT \'{}\'::JSONB;\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS is_major BOOLEAN DEFAULT false;\n';
  sql += 'ALTER TABLE stations ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;\n\n';

  sql += '-- Step 2: インデックスを追加\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_stations_coordinates ON stations(latitude, longitude);\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_stations_index_letter ON stations(index_letter);\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_stations_is_major ON stations(is_major);\n';
  sql += 'CREATE INDEX IF NOT EXISTS idx_stations_name ON stations(name);\n\n';

  sql += '-- Step 3: 既存データを削除\n';
  sql += 'DELETE FROM stations;\n\n';

  sql += '-- Step 4: データを挿入\n';

  stations.forEach((station, index) => {
    const escape = (str) => str ? str.replace(/'/g, "''") : '';

    // PostgreSQL配列形式に変換: ARRAY['item1', 'item2']
    const railwayLinesArray = station.railway_lines && station.railway_lines.length > 0
      ? `ARRAY[${station.railway_lines.map(line => `'${escape(line)}'`).join(', ')}]::TEXT[]`
      : `'{}'::TEXT[]`;

    // JSONBは文字列としてエスケープ
    const lineOrdersJson = station.line_orders && Object.keys(station.line_orders).length > 0
      ? `'${JSON.stringify(station.line_orders).replace(/'/g, "''")}'::JSONB`
      : `'{}'::JSONB`;

    const values = [
      `'${station.id}'`,
      `'${escape(station.name)}'`,
      station.index_letter ? `'${escape(station.index_letter)}'` : 'NULL',
      station.latitude || 'NULL',
      station.longitude || 'NULL',
      station.is_within_tokyo23 != null ? station.is_within_tokyo23 : 'true',
      railwayLinesArray,
      lineOrdersJson,
      station.is_major != null ? station.is_major : 'false',
      station.display_order || 0,
      `'${station.created_at}'`
    ];

    sql += `INSERT INTO stations (id, name, index_letter, latitude, longitude, is_within_tokyo23, railway_lines, line_orders, is_major, display_order, created_at) VALUES (${values.join(', ')});\n`;

    if ((index + 1) % 50 === 0) {
      sql += `-- Progress: ${index + 1}/${stations.length}\n`;
    }
  });

  sql += '\n-- Step 5: 検証\n';
  sql += 'SELECT COUNT(*) as total_stations FROM stations;\n';
  sql += 'SELECT COUNT(*) as stations_with_coordinates FROM stations WHERE latitude IS NOT NULL AND longitude IS NOT NULL;\n';

  const filePath = '/Users/yoshidaseiichi/yoshidasendai/tukuyomi/tukuyomi-admin/scripts/complete_stations_sync_fixed.sql';
  fs.writeFileSync(filePath, sql);

  console.log('SQL file created:', filePath);
  console.log('Total INSERT statements:', stations.length);
})();
