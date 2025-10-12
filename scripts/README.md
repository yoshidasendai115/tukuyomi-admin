# Scripts

このディレクトリには、プロジェクトの運用に必要なスクリプトが格納されています。

## ログ監視スクリプト

### watch-logs.sh

Vercel本番環境のログをリアルタイムで監視するスクリプトです。

**使用方法:**

```bash
# 直接実行
./scripts/watch-logs.sh

# npmスクリプトから実行（推奨）
npm run logs:watch
```

**機能:**
- 30秒ごとに最新のログを取得
- エラーログを赤色で強調表示
- 警告ログを黄色で強調表示
- タイムスタンプ付きで見やすく表示
- Ctrl+Cで終了可能

### その他のログコマンド

```bash
# 本番環境のログを1回だけ表示
npm run logs:prod

# JSON形式でログを取得（jqで加工可能）
npm run logs:json

# エラーログのみをフィルタリング
npm run logs:json | jq 'select(.level == "error")'

# 特定の文字列を含むログをフィルタリング
npm run logs:json | jq 'select(.message | contains("API"))'
```

## 注意事項

- ログ監視には Vercel CLI が必要です（既にインストール済み）
- ログは最大5分間表示されます（Vercel CLIの仕様）
- `vercel whoami` でログインしていることを確認してください
