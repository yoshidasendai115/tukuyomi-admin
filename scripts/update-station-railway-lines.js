const fs = require('fs');
const path = require('path');

// railway-lines.tsからRAILWAY_LINESの定義を抽出して解析
const railwayLinesPath = path.join(__dirname, '..', 'lib', 'constants', 'railway-lines.ts');
const content = fs.readFileSync(railwayLinesPath, 'utf-8');

// RAILWAY_LINESのJSONを抽出（簡易パーサー）
const match = content.match(/export const RAILWAY_LINES = ({[\s\S]*?}) as const;/);
if (!match) {
  console.error('Failed to extract RAILWAY_LINES');
  process.exit(1);
}

// TypeScriptのオブジェクトをJavaScriptで評価可能な形式に変換
const railwayLinesStr = match[1]
  .replace(/\/\/.*/g, '') // コメント削除
  .replace(/(\w+):/g, '"$1":'); // キーをダブルクォートで囲む

let RAILWAY_LINES;
try {
  RAILWAY_LINES = eval(`(${railwayLinesStr})`);
} catch (e) {
  console.error('Failed to parse RAILWAY_LINES:', e);
  process.exit(1);
}

// 駅ごとのマッピングを作成
const stationMapping = new Map(); // Map<stationName, { railwayLines: string[], lineOrders: Record<string, number> }>

for (const [lineName, stations] of Object.entries(RAILWAY_LINES)) {
  stations.forEach((stationName, index) => {
    if (!stationMapping.has(stationName)) {
      stationMapping.set(stationName, {
        railwayLines: [],
        lineOrders: {}
      });
    }

    const mapping = stationMapping.get(stationName);
    mapping.railwayLines.push(lineName);
    mapping.lineOrders[lineName] = index + 1; // 1-based index
  });
}

console.log(`Total unique stations: ${stationMapping.size}`);
console.log('');

// SQLクエリを生成
const sqlStatements = [];

for (const [stationName, mapping] of stationMapping.entries()) {
  const railwayLinesArray = `{${mapping.railwayLines.map(line => `"${line.replace(/"/g, '\\"')}"`).join(',')}}`;
  const lineOrdersJson = JSON.stringify(mapping.lineOrders);

  // 駅名に「駅」を追加してマッチング
  const stationNameWithSuffix = `${stationName}駅`;

  const sql = `UPDATE stations
SET railway_lines = '${railwayLinesArray}'::text[],
    line_orders = '${lineOrdersJson.replace(/'/g, "''")}'::jsonb
WHERE name = '${stationNameWithSuffix.replace(/'/g, "''")}';`;

  sqlStatements.push(sql);
}

// SQLファイルに出力
const outputPath = path.join(__dirname, 'update-station-railway-lines.sql');
const sqlContent = `-- 駅の路線情報を更新するSQLスクリプト
-- 生成日時: ${new Date().toISOString()}

${sqlStatements.join('\n\n')}
`;

fs.writeFileSync(outputPath, sqlContent, 'utf-8');
console.log(`SQL file generated: ${outputPath}`);
console.log(`Total UPDATE statements: ${sqlStatements.length}`);
console.log('');

// サンプルデータを表示
console.log('Sample mappings:');
const sampleStations = ['東京', '渋谷', '新宿'];
for (const station of sampleStations) {
  if (stationMapping.has(station)) {
    const mapping = stationMapping.get(station);
    console.log(`\n${station}:`);
    console.log(`  railway_lines: [${mapping.railwayLines.join(', ')}]`);
    console.log(`  line_orders: ${JSON.stringify(mapping.lineOrders, null, 2)}`);
  }
}
