# Supabase Storage設定ガイド

## 問題：画像がプレビューされない

画像アップロード後にプレビューが表示されない場合、以下を確認してください。

## 1. Supabaseダッシュボードでバケット設定を確認

### 手順：

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「Storage」をクリック
4. `admin-documents` バケットを選択

### 確認項目：

#### A. バケットの公開設定
- バケットが「Public」になっているか確認
- Privateの場合は以下の手順で公開に変更：
  1. バケット名の右側の「...」メニューをクリック
  2. 「Make public」を選択
  3. 確認ダイアログで「Make public」をクリック

#### B. バケットのポリシー設定
「Policies」タブで以下のポリシーが設定されているか確認：

**読み取り許可ポリシー（SELECT）:**
```sql
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'admin-documents');
```

**書き込み許可ポリシー（INSERT）:**
```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'admin-documents');
```

## 2. バケットが存在しない場合

### バケット作成手順：

1. Storage画面で「New bucket」をクリック
2. バケット名: `admin-documents`
3. 「Public bucket」をONにする
4. 「Create bucket」をクリック

## 3. CORS設定の確認

Supabase StorageのCORS設定を確認：

1. Supabaseダッシュボード → Project Settings → API
2. 「CORS Settings」セクションを確認
3. 以下のドメインが許可されているか：
   - `http://localhost:3002`
   - `http://localhost:3000`
   - 本番環境のドメイン

## 4. 環境変数の確認

`.env.local`ファイルで以下の環境変数が正しく設定されているか確認：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. デバッグ方法

### ブラウザの開発者ツール（F12）で確認：

#### コンソールタブ：
- `Upload result:` - アップロード成功時のレスポンス
- `Image URL:` - 生成された画像URL
- `Image loaded successfully:` - 画像読み込み成功
- `Image load error:` - 画像読み込み失敗（URLやCORSの問題）

#### ネットワークタブ：
1. 画像URLへのリクエストを探す
2. ステータスコードを確認：
   - `200 OK` - 成功
   - `403 Forbidden` - アクセス権限の問題
   - `404 Not Found` - ファイルが見つからない
   - `CORS error` - CORS設定の問題

## 6. よくある問題と解決方法

### 問題1: 403 Forbidden
**原因**: バケットがPrivateまたはポリシーが設定されていない
**解決**: バケットをPublicにするか、適切なポリシーを設定

### 問題2: CORS Error
**原因**: SupabaseのCORS設定にlocalhostが含まれていない
**解決**: Project Settings → API → CORS Settingsで`http://localhost:3002`を追加

### 問題3: 画像URLが間違っている
**原因**: Supabase URLが正しく設定されていない
**解決**: `.env.local`の`NEXT_PUBLIC_SUPABASE_URL`を確認

### 問題4: バケットが存在しない
**原因**: `admin-documents`バケットが作成されていない
**解決**: 上記の「バケット作成手順」に従って作成

## 7. テスト方法

画像URLを直接ブラウザで開いてみる：
1. コンソールログから画像URLをコピー
2. 新しいタブでURLを開く
3. 画像が表示されるか確認

表示されない場合：
- URLが正しいか確認
- Supabaseのストレージ設定を見直す

## 8. サポート情報

それでも解決しない場合は、以下の情報を提供してください：
- ブラウザのコンソールエラー
- ネットワークタブのレスポンス
- Supabaseバケットの設定スクリーンショット
- 生成された画像URL
