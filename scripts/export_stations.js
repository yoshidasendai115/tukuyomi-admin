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

  // Generate DELETE and INSERT statements
  let sql = '-- Sync stations data from local to remote Supabase\n';
  sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
  sql += '-- Delete existing stations data\n';
  sql += 'DELETE FROM stations;\n\n';
  sql += '-- Insert stations data\n';

  stations.forEach((station, index) => {
    const escape = (str) => str ? str.replace(/'/g, "''") : '';

    const values = [
      `'${station.id}'`,
      `'${escape(station.name)}'`,
      station.index_letter ? `'${escape(station.index_letter)}'` : 'NULL',
      station.latitude || 'NULL',
      station.longitude || 'NULL',
      station.is_within_tokyo23 != null ? station.is_within_tokyo23 : 'true',
      station.railway_lines ? `'${JSON.stringify(station.railway_lines)}'::text[]` : `'{}'::text[]`,
      station.line_orders ? `'${JSON.stringify(station.line_orders)}'::jsonb` : `'{}'::jsonb`,
      station.is_major != null ? station.is_major : 'false',
      station.display_order || 0,
      `'${station.created_at}'`
    ];

    sql += `INSERT INTO stations (id, name, index_letter, latitude, longitude, is_within_tokyo23, railway_lines, line_orders, is_major, display_order, created_at) VALUES (${values.join(', ')});\n`;

    if ((index + 1) % 50 === 0) {
      sql += `-- Progress: ${index + 1}/${stations.length}\n`;
    }
  });

  sql += '\n-- Verify count\n';
  sql += 'SELECT COUNT(*) as total_stations FROM stations;\n';

  const filePath = '/Users/yoshidaseiichi/yoshidasendai/tukuyomi/tukuyomi-admin/scripts/sync_stations_to_remote.sql';
  fs.writeFileSync(filePath, sql);

  console.log('SQL file created:', filePath);
  console.log('Total INSERT statements:', stations.length);
  console.log('\nTo apply to remote Supabase:');
  console.log('1. Open Supabase Dashboard > SQL Editor');
  console.log('2. Copy and paste the contents of sync_stations_to_remote.sql');
  console.log('3. Execute the SQL');
})();
