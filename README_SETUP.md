# Tukuyomi Admin セットアップ手順

## 初期セットアップ（初回のみ）

### 1. 管理者認証システムの設定

管理者ログイン機能を使用するために、以下の手順で認証テーブルと関数を作成してください。

#### 方法A: Supabase Studioから実行（推奨）

1. Supabase Studioを開く
   ```
   http://localhost:54323
   ```

2. 左メニューから「SQL Editor」を選択

3. 以下のファイルの内容をコピー＆ペースト
   ```
   scripts/apply-admin-auth.sql
   ```

4. 「Run」ボタンをクリック

5. 実行結果を確認
   - 「管理者ユーザーが作成されました」というメッセージが表示されればOK
   - エラーが表示された場合は、エラー内容を確認してください

#### 方法B: コマンドラインから実行

```bash
# Supabaseのデータベースに接続して実行
psql "postgresql://postgres:postgres@localhost:54322/postgres" < scripts/apply-admin-auth.sql
```

### 2. 確認

設定が正しく完了したか確認：

```bash
# 確認用SQLを実行
psql "postgresql://postgres:postgres@localhost:54322/postgres" < scripts/check-auth-function.sql
```

正常に設定されていれば、以下が表示されます：
- `authenticate_admin` 関数
- `ga-ren` と `ys-yoshida` のユーザー情報

## ログイン情報

初期管理者アカウント：

| ログインID | パスワード | 権限 |
|-----------|-----------|------|
| ga-ren | Pass1234@! | super_admin |
| ys-yoshida | Pass1234@! | super_admin |

## トラブルシューティング

### ログイン時に「認証システムが未設定です」と表示される場合

1. 上記の「1. 管理者認証システムの設定」を実行してください
2. Supabase Studioで `admin_auth_users` テーブルが存在することを確認
3. `authenticate_admin` 関数が存在することを確認

### パスワードを忘れた場合

Supabase Studioから直接パスワードをリセット：

```sql
-- パスワードを 'NewPassword123!' にリセット（例）
UPDATE admin_auth_users
SET password_hash = md5('NewPassword123!'),
    failed_attempts = 0,
    locked_until = NULL
WHERE login_id = 'ga-ren';  -- 対象のログインIDを指定
```

### アカウントがロックされた場合

5回ログインに失敗すると30分間ロックされます。即座に解除する場合：

```sql
UPDATE admin_auth_users
SET failed_attempts = 0,
    locked_until = NULL
WHERE login_id = 'ga-ren';  -- 対象のログインIDを指定
```

## 注意事項

- **既存データの保護**: このセットアップスクリプトは既存のデータを削除しません
- **パスワード管理**: 本番環境では初期パスワードを必ず変更してください
- **セキュリティ**: 本番環境ではMD5ではなく、bcryptなどのより安全なハッシュ関数を使用してください