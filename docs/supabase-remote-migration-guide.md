# Supabase リモートマイグレーション実行ガイド

## 概要
このドキュメントは、Supabase CLIを使用してリモートデータベースに直接マイグレーションを実行する方法を記録したものです。

## 前提条件

### 必要な情報
- **プロジェクト名**: `garunavi`
- **プロジェクトRef**: `aexizormxwwoyermbhfr`
- **データベースホスト**: `aws-0-ap-northeast-1.pooler.supabase.com`
- **ポート**: `6543`
- **ユーザー名**: `postgres.aexizormxwwoyermbhfr`
- **データベース名**: `postgres`
- **パスワード**: Supabase Dashboard > Settings > Database で確認

### 必要なツール
- Supabase CLI (v2.45.5以上)
- psql (PostgreSQLクライアント)
- Node.js (確認スクリプト実行用)

## 実行方法

### 1. Supabase CLIでpsqlを使用した直接実行

#### 基本コマンド構文
```bash
PGPASSWORD="[YOUR-DB-PASSWORD]" psql \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -f [SQLファイルパス]
```

#### 実際の使用例
```bash
# Part 0 - storesテーブルの制約調整
PGPASSWORD="[YOUR-DB-PASSWORD]" psql \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -f supabase/migrations/remote_migration_part0_missing_columns.sql

# Part 2 - 基本テーブルの作成
PGPASSWORD="[YOUR-DB-PASSWORD]" psql \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -f supabase/migrations/remote_migration_part2_auth_aware.sql

# Part 3 - 関連テーブルの作成
env PGPASSWORD="[YOUR-DB-PASSWORD]" psql \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -f supabase/migrations/remote_migration_part3_relations.sql
```

### 2. 環境変数を使用した方法

```bash
# 環境変数を設定
export PGPASSWORD='[YOUR-DB-PASSWORD]'

# SQLファイルを実行
psql -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -f [SQLファイルパス]
```

### 3. envコマンドを使用した方法（推奨）

```bash
env PGPASSWORD="[YOUR-DB-PASSWORD]" psql \
  -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -f [SQLファイルパス]
```

## マイグレーションファイルの構成

### 実行順序
1. **Part 0**: `remote_migration_part0_missing_columns.sql`
   - 既存テーブルの制約とデフォルト値の調整
   - インデックスの追加

2. **Part 1**: `remote_migration_part1_alter_columns.sql`
   - 既存テーブルへのカラム追加
   - stores, areas, messagesテーブルの更新

3. **Part 2**: `remote_migration_part2_auth_aware.sql`
   - 基本テーブルの作成
   - 外部キー制約を緩和した安全な実装

4. **Part 3**: `remote_migration_part3_relations.sql`
   - 関連テーブルの作成
   - トリガーとインデックスの設定
   - RLSポリシーの適用

## 実行結果の確認

### Node.jsスクリプトで確認

```javascript
// scripts/check-new-tables.js
const { createClient } = require('@supabase/supabase-js');

const REMOTE_URL = 'https://aexizormxwwoyermbhfr.supabase.co';
const REMOTE_ANON_KEY = '[YOUR-ANON-KEY]';

const remoteSupabase = createClient(REMOTE_URL, REMOTE_ANON_KEY);

// テーブルの存在確認
async function checkTables() {
  const tables = ['users', 'profiles', 'cast_profiles', /* ... */];

  for (const table of tables) {
    const { count, error } = await remoteSupabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: Does not exist`);
    } else {
      console.log(`✅ ${table}: Exists (${count || 0} records)`);
    }
  }
}
```

### コマンド実行
```bash
node scripts/check-new-tables.js
```

## トラブルシューティング

### 接続エラーが発生する場合

1. **パスワードエラー**
   ```
   error received from server in SCRAM exchange: Wrong password
   ```
   - データベースパスワードを再確認
   - Supabase Dashboard > Settings > Database で正しいパスワードを取得

2. **環境による違い**
   - macOS/Linuxでは`PGPASSWORD="password"`形式を使用
   - `export PGPASSWORD='password'`は環境によって動作しない場合がある
   - `env PGPASSWORD="password"`が最も確実

3. **部分実行**
   - エラーが出た場合は、SQLファイルをセクションごとに分割して実行
   - 各SECTIONコメントで区切られた部分を個別に実行

### 代替手段

#### Supabase Dashboard SQLエディタ
最も簡単で確実な方法：
1. https://supabase.com/dashboard/project/aexizormxwwoyermbhfr/sql/new
2. SQLファイルの内容をコピー＆ペースト
3. 「Run」ボタンをクリック

## セキュリティに関する注意事項

### パスワード管理
- データベースパスワードは環境変数や.envファイルで管理
- コマンド履歴に残らないよう注意
- 本番環境のパスワードは定期的に変更

### 推奨される実行方法
```bash
# パスワードをファイルから読み込む
PGPASSWORD=$(cat .env.production | grep DB_PASSWORD | cut -d'=' -f2) psql ...

# または、対話的にパスワードを入力
psql -h aws-0-ap-northeast-1.pooler.supabase.com \
  -p 6543 \
  -U postgres.aexizormxwwoyermbhfr \
  -d postgres \
  -W \
  -f [SQLファイルパス]
```

## まとめ

### 成功の要因
1. **Supabase CLIとpsqlの組み合わせ**: JavaScriptからは実行できないDDLをCLI経由で実行
2. **段階的な実行**: Part 0 → Part 2 → Part 3の順序で依存関係を考慮
3. **エラーハンドリング**: `IF NOT EXISTS`を使用して冪等性を確保
4. **確認スクリプト**: Node.jsで作成結果を即座に確認

### 利点
- Supabase Dashboardを開かずにコマンドラインで完結
- スクリプト化による自動化が可能
- バージョン管理されたSQLファイルを直接実行
- エラーログが明確で問題の特定が容易

## 実行日時記録
- **2024年9月28日**: 初回マイグレーション実行
- **実行者**: Claude via Supabase CLI
- **結果**: 26テーブルを正常に作成