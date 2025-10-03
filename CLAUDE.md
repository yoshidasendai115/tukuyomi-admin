# Claude用指示書 - Tukuyomi Admin

## 🔴 最重要ルール - データ保護

### 絶対的禁止事項（これらは絶対に実行しない）

1. **既存データの削除禁止**
   - `TRUNCATE` コマンドの使用禁止
   - `DELETE` コマンドの使用禁止（WHERE句があっても禁止）
   - `DROP TABLE` コマンドの使用禁止（既存テーブル）
   - `DROP DATABASE` コマンドの使用禁止
   - `supabase db reset` コマンドの使用禁止
   - データを削除する可能性のあるマイグレーションの作成禁止

2. **破壊的変更の禁止**
   - 既存カラムの削除（`DROP COLUMN`）禁止
   - 既存カラムのデータ型変更禁止（データ損失の可能性がある場合）
   - 既存の制約を削除する変更禁止
   - 既存インデックスの削除禁止

3. **Supabase CLIコマンドの制限**
   - `supabase db reset` コマンドの使用禁止（全データが削除される）
   - `supabase db push --force` の使用禁止（既存データの上書きリスク）
   - データベースリセットが必要な場合は、必ずユーザーに確認を取る

4. **安全な操作のみ許可**
   - 新規テーブルの作成：✅ 許可
   - 新規カラムの追加：✅ 許可
   - 新規インデックスの追加：✅ 許可
   - データの UPDATE（WHERE句必須）：✅ 許可
   - データの INSERT：✅ 許可
   - データの SELECT：✅ 許可

### SQLを書く前の確認事項

SQLやマイグレーションを作成する前に、必ず以下を確認：

1. このSQLは既存のデータを削除しますか？ → **削除する場合は作成しない**
2. このSQLは既存のテーブル構造を破壊しますか？ → **破壊する場合は作成しない**
3. このSQLは元に戻せない変更を含みますか？ → **含む場合は警告を表示**

### マイグレーション作成時のルール

```sql
-- ✅ 良い例：新規テーブルの作成
CREATE TABLE IF NOT EXISTS new_table_name (...);

-- ✅ 良い例：新規カラムの追加
ALTER TABLE existing_table ADD COLUMN IF NOT EXISTS new_column type;

-- ❌ 悪い例：既存データの削除
TRUNCATE existing_table;  -- 絶対禁止
DELETE FROM existing_table;  -- 絶対禁止
DROP TABLE existing_table;  -- 絶対禁止
```

### 開発環境でも本番環境でも同じルール

ローカルのSupabaseであっても、既存データは貴重なテストデータです。
削除が必要な場合は、必ず以下の手順を踏む：

1. ユーザーに明示的に確認を取る
2. バックアップ方法を提示する
3. ユーザーの承認を得てから実行する

### 安全なデータベース操作ワークフロー

#### マイグレーション作成時
```bash
# ✅ 正しい手順
1. マイグレーションファイルを作成（CREATE, ALTER ADD のみ）
2. ローカルで適用: supabase migration up
3. 動作確認
4. リモートに適用: supabase db push

# ❌ 禁止されている操作
supabase db reset  # 絶対に実行しない
supabase db push --force  # 既存データを破壊する可能性
```

#### スキーマ変更が必要な場合
```bash
# 新規マイグレーションを作成して追加変更を行う
# 既存のマイグレーションは絶対に編集しない
```

#### データベースの状態確認
```bash
# ✅ 安全な確認コマンド
supabase db diff  # ローカルとリモートの差分確認
supabase migration list  # マイグレーション履歴確認
```

---

## マーメイド図の作成に関する注意事項

### エラー「No diagram type detected matching given configuration for text:」の対応

マーメイド図を作成する際に、このエラーが発生する場合は以下の点に注意してください：

1. **participant宣言の問題**
   - 日本語のエイリアス（`as`）を使用すると認識されない場合がある
   - 長い名前や特殊文字（スラッシュ、括弧など）を含む名前は避ける

   ```mermaid
   # 悪い例
   participant handler as handler関数
   participant database as database/index.mjs
   participant dcerm_db as dcerm_db(PostgreSQL)

   # 良い例
   participant C as Client
   participant H as handler
   participant D as database
   participant DB as dcerm_db
   ```

2. **シンプルな構文を使用**
   - 複雑な記法よりも基本的な構文を優先する
   - 初期化設定（`%%{init: {'theme':'base'}}%%`）は使用しない

3. **推奨される書き方**
   ```mermaid
   sequenceDiagram
       participant C as Client
       participant H as handler
       participant D as database
       participant DB as dcerm_db

       C->>H: リクエスト
       H->>D: 処理
       D-->>H: レスポンス
       H-->>C: 結果
   ```

4. **代替案**
   - シーケンス図が認識されない場合は、フローチャート（graph TD）を使用
   - テキスト形式での処理シーケンスも併記する

## Playwright MCP使用ルール

### 絶対的な禁止事項

1. **いかなる形式のコード実行も禁止**
   - Python、JavaScript、Bash等でのブラウザ操作
   - MCPツールを調査するためのコード実行
   - subprocessやコマンド実行によるアプローチ

2. **利用可能なのはMCPツールの直接呼び出しのみ**
   - playwright:browser_navigate
   - playwright:browser_screenshot
   - 他のPlaywright MCPツール

3. **エラー時は即座に報告**
   - 回避策を探さない
   - 代替手段を実行しない
   - エラーメッセージをそのまま伝える

# Guidelines

This document defines the project's rules, objectives, and progress management methods. Please proceed with the project according to the following content.

## Top-Level Rules

- To maximize efficiency, **if you need to execute multiple independent processes, invoke those tools concurrently, not sequentially**.
- **You must think exclusively in English**. However, you are required to **respond in Japanese**.
- To understand how to use a library, **always use the Context7 MCP** to retrieve the latest information.

## Programming Rules

- Avoid hard-coding values unless absolutely necessary.
- Do not use `any` or `unknown` types in TypeScript.
- You must not use a TypeScript `class` unless it is absolutely necessary (e.g., extending the `Error` class for custom error handling that requires `instanceof` checks).

## 作業完了通知の自動化

作業完了時には以下のコマンドを実行して、macOSの通知センターに完了通知を送信すること：

```bash
osascript -e 'display notification "${TASK_DESCRIPTION} is complete" with title "${REPOSITORY_NAME}"'
```

- `${TASK_DESCRIPTION}`: 完了したタスクの簡潔な説明に置き換える
- `${REPOSITORY_NAME}`: 作業中のリポジトリ名またはプロジェクト名に置き換える
- 重要なタスクや複数ステップのタスクが完了した際に実行すること

## コミットルール

- **自動コミットは絶対に禁止**
- コミットは必ずユーザーから明示的な指示があった場合のみ実行すること
- 「コミットしてください」等の明確な指示を待つこと
- コード変更後も勝手にコミットせず、ユーザーの確認と指示を待つこと
- git addコマンドも勝手に実行しないこと
- コミットメッセージにClaude関連の情報（🤖マーク、Generated with Claude Code、Co-Authored-By等）を含めないこと

## ブランチ管理ルール

- **Devブランチへのマージは禁止**
- マージは必ずユーザーから明示的な指示があった場合のみ実行すること
- 「Devブランチにマージしてください」等の明確な指示を待つこと
- 現在のフィーチャーブランチでの作業を継続し、指示があるまでマージしないこと