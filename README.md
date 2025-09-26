# Tukuyomi Admin System

店舗オーナー向け管理システムおよびシステム管理者向け管理画面

## 機能概要

### 1. 店舗オーナー向け機能
- 店舗編集URL申請
- PIN認証による安全なアクセス
- 自店舗情報の編集
- 求人情報管理
- 応募者管理

### 2. システム管理者向け機能
- 申請承認・URL発行
- 店舗データ管理
- ユーザー管理
- マスターデータメンテナンス
- システム通知管理

## セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env.local`ファイルに以下を設定：
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. データベースのマイグレーション
```bash
npx supabase migration up
```

### 4. 管理者ユーザーの作成
```bash
node scripts/create-admin.js
```

### 5. 開発サーバーの起動
```bash
npm run dev
```

ポート3001で起動します: http://localhost:3001

## ディレクトリ構造

```
tukuyomi-admin/
├── app/                     # Next.js App Router
│   ├── (auth)/             # 認証関連
│   ├── (owner)/            # 店舗オーナー向け
│   ├── (admin)/            # システム管理者向け
│   └── api/                # API Routes
├── components/             # 共通コンポーネント
├── lib/                    # ユーティリティ
├── types/                  # 型定義
└── public/                 # 静的ファイル
```

## セキュリティ機能

- **2段階認証**: URL + PINコード
- **レート制限**: IPベースの試行回数制限
- **アカウントロック**: 失敗回数超過時の自動ロック
- **セッション管理**: 有効期限と使用回数制限
- **監査ログ**: 全アクセスの記録

## API仕様

### 認証API
- `POST /api/auth/login` - 管理者ログイン
- `POST /api/auth/validate-token` - トークン検証
- `POST /api/auth/logout` - ログアウト

### 申請管理API
- `GET /api/requests` - 申請一覧取得
- `POST /api/requests` - 新規申請
- `PUT /api/requests/:id` - 申請更新
- `POST /api/requests/:id/approve` - 承認処理

### 店舗管理API
- `GET /api/stores/:id` - 店舗情報取得
- `PUT /api/stores/:id` - 店舗情報更新
- `POST /api/stores/:id/images` - 画像アップロード

## 開発用コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm start

# 型チェック
npm run type-check

# リント
npm run lint
```