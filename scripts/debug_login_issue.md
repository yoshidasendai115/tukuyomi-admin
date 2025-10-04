# ログイン401エラー デバッグガイド

## 現在の状況

- **エラー**: `POST /api/auth/login 401 (Unauthorized)`
- **環境**: Vercel本番環境 (https://tukuyomi-admin-dxbscbi2m-yoshidasendai.vercel.app)
- **ログインID**: ys-yoshida
- **パスワードハッシュ**: bcrypt形式に修正済み (63文字、$2b$10$プレフィックス)

## 確認済み項目

✅ **ビルド**: 成功 (Next.js 15.5.3, Turbopack)
✅ **環境変数**:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_SECRET_KEY
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - JWT_SECRET
✅ **パスワードハッシュ**: bcrypt形式 (LENGTH=63)
✅ **アカウント状態**:
  - is_active: true
  - failed_attempts: 0
  - locked_until: null

## 調査が必要な項目

### 1. APIレスポンスの詳細確認

ブラウザの開発者ツールで以下を確認：

1. F12キーで開発者ツールを開く
2. Networkタブを選択
3. もう一度ログインを試す
4. `login` リクエストをクリック
5. **Response**タブの内容を確認

期待されるレスポンス形式：
```json
{
  "message": "ログインIDまたはパスワードが正しくありません",
  "attemptsRemaining": 4
}
```

または

```json
{
  "message": "サーバー設定エラー：管理者に連絡してください"
}
```

### 2. リモートSupabaseの接続確認

リモートSupabaseに直接接続してアカウント状態を確認：

```bash
# リモートSupabaseに接続
export SUPABASE_DB_URL="postgresql://postgres.[project-ref]:[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres"

# アカウント詳細確認
psql $SUPABASE_DB_URL -f scripts/check_remote_admin_users.sql
```

### 3. Vercelランタイムログの確認

```bash
# リアルタイムログを表示
vercel logs https://tukuyomi-admin-dxbscbi2m-yoshidasendai.vercel.app --follow

# または特定の時間範囲のログ
vercel logs https://tukuyomi-admin-dxbscbi2m-yoshidasendai.vercel.app --since 5m
```

ログで確認すべき項目：
- `Login attempt:` - ログイン試行のログ
- `User not found:` - ユーザーが見つからない
- `Service Role Key not configured` - 環境変数エラー
- `Login error:` - 予期しないエラー

### 4. 環境変数の値確認

Vercel環境変数の実際の値を確認（セキュリティに注意）：

```bash
# 環境変数の値を確認（最初の20文字のみ）
vercel env pull .env.production
cat .env.production | grep SUPABASE | sed 's/\(.\{20\}\).*/\1.../'
```

### 5. ローカルとリモートの差分確認

ローカルで同じ認証情報でログインを試す：

1. ローカル開発サーバーを起動: `npm run dev`
2. http://localhost:3000/admin/login にアクセス
3. ys-yoshida / Pass1234@! でログイン
4. 成功するか確認

成功した場合、ローカルとVercelの環境差分が原因。

## 可能性のある原因

### 原因1: 環境変数の不一致

**症状**: Service Role Keyが間違っている、または設定されていない

**確認方法**:
```bash
vercel env ls
```

**修正方法**:
```bash
# 正しいService Role Keyを再設定
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### 原因2: Supabase URLの不一致

**症状**: ローカルとリモートで異なるSupabase URLを使用

**確認方法**:
- ローカル: `http://127.0.0.1:54321`
- リモート: `https://<project-ref>.supabase.co`

**修正方法**:
Vercelの `NEXT_PUBLIC_SUPABASE_URL` を本番Supabase URLに設定

### 原因3: パスワードハッシュの不一致

**症状**: 入力したパスワードとハッシュが一致しない

**確認方法**:
```bash
# ローカルのハッシュを確認
PGPASSWORD=postgres psql -U postgres -h 127.0.0.1 -p 54322 -d postgres \
  -c "SELECT login_id, password_hash FROM admin_auth_users WHERE login_id = 'ys-yoshida';"
```

**修正方法**:
リモートのハッシュをローカルと同じ値に更新

### 原因4: bcryptライブラリの互換性

**症状**: Vercelのnodejsランタイムでbcryptが正しく動作しない

**確認方法**:
Vercelログで以下のエラーを確認：
- `Error: bcrypt is not supported`
- `Module not found: bcryptjs`

**修正方法**:
`bcryptjs`を使用（既に使用中）

### 原因5: Supabaseのネットワーク制限

**症状**: VercelのIPアドレスがSupabaseでブロックされている

**確認方法**:
Supabaseダッシュボード → Settings → Database → Network Restrictions

**修正方法**:
ネットワーク制限を無効化、またはVercelのIPレンジを許可

## 次のステップ

1. **ブラウザのNetworkタブでAPIレスポンスを確認** ← 最優先
2. Vercelランタイムログを確認
3. リモートSupabaseに直接接続してアカウント状態を確認
4. 環境変数の値を確認
5. 必要に応じて環境変数を再設定

## 参考情報

- ログインAPIエンドポイント: `/app/api/auth/login/route.ts`
- Supabase設定: `/lib/supabase.ts`
- 認証ロジック: `lib/auth.ts`
- Vercelデプロイメント: https://tukuyomi-admin-dxbscbi2m-yoshidasendai.vercel.app
