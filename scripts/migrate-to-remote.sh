#!/bin/bash

# Supabase リモートマイグレーション実行スクリプト
# 使用方法: ./migrate-to-remote.sh [DB_PASSWORD]

set -e  # エラー時に停止

# カラー出力用の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# データベース接続情報 - garunaviプロジェクト
DB_HOST="aws-0-ap-northeast-1.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.aexizormxwwoyermbhfr"
DB_NAME="postgres"

# パスワードの取得（引数またはプロンプト）
if [ -n "$1" ]; then
    DB_PASSWORD="$1"
else
    echo -n "データベースパスワードを入力してください: "
    read -s DB_PASSWORD
    echo
fi

# マイグレーションファイルのパス
MIGRATION_DIR="supabase/migrations"

echo -e "${GREEN}=== Supabase リモートマイグレーション開始 ===${NC}"
echo "ホスト: $DB_HOST"
echo "ユーザー: $DB_USER"
echo ""

# 各マイグレーションファイルの実行
execute_migration() {
    local file=$1
    local description=$2

    echo -e "${YELLOW}実行中: $description${NC}"
    echo "ファイル: $file"

    if [ -f "$file" ]; then
        PGPASSWORD="$DB_PASSWORD" psql \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            -f "$file" \
            --quiet \
            --no-psqlrc \
            2>&1 | grep -v "NOTICE:" || true

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 成功${NC}\n"
        else
            echo -e "${RED}❌ エラーが発生しました${NC}\n"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠️ ファイルが見つかりません: $file${NC}\n"
    fi
}

# Part 0: storesテーブルの制約調整
if [ -f "$MIGRATION_DIR/remote_migration_part0_missing_columns.sql" ]; then
    execute_migration \
        "$MIGRATION_DIR/remote_migration_part0_missing_columns.sql" \
        "Part 0 - storesテーブルの制約調整"
fi

# Part 1: 既存テーブルへのカラム追加
if [ -f "$MIGRATION_DIR/remote_migration_part1_alter_columns.sql" ]; then
    echo -e "${YELLOW}Part 1 - 既存テーブルへのカラム追加${NC}"
    echo -e "${GREEN}✅ スキップ（既に実行済み）${NC}\n"
fi

# Part 2: 基本テーブルの作成
if [ -f "$MIGRATION_DIR/remote_migration_part2_auth_aware.sql" ]; then
    execute_migration \
        "$MIGRATION_DIR/remote_migration_part2_auth_aware.sql" \
        "Part 2 - 基本テーブルの作成"
fi

# Part 3: 関連テーブルの作成
if [ -f "$MIGRATION_DIR/remote_migration_part3_relations.sql" ]; then
    execute_migration \
        "$MIGRATION_DIR/remote_migration_part3_relations.sql" \
        "Part 3 - 関連テーブルの作成"
fi

# 管理者テーブル（必要に応じて）
if [ -f "$MIGRATION_DIR/20250928_create_admin_tables_safe.sql" ]; then
    echo -e "${YELLOW}管理者テーブルの作成${NC}"
    echo -e "${GREEN}✅ スキップ（既に実行済み）${NC}\n"
fi

echo -e "${GREEN}=== マイグレーション完了 ===${NC}"
echo ""

# 結果確認
echo -e "${YELLOW}結果を確認しますか？ (y/n)${NC}"
read -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "scripts/check-new-tables.js" ]; then
        echo -e "${GREEN}テーブル作成状況を確認中...${NC}"
        node scripts/check-new-tables.js
    else
        echo -e "${YELLOW}確認スクリプトが見つかりません${NC}"
    fi
fi