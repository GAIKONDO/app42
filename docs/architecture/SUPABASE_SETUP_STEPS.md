# Supabaseプロジェクトセットアップ手順

ステップ1-4まで確認できたら、Supabaseプロジェクトのセットアップに進みます。

## ステップ1: Supabaseプロジェクトの作成

### 1.1. Supabaseアカウントの作成

1. [Supabase](https://supabase.com/)にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでログイン（推奨）

### 1.2. 新しいプロジェクトの作成

1. ダッシュボードで「New project」をクリック
2. 以下の情報を入力：
   - **Name**: プロジェクト名（例: `network-mock-app`）
   - **Database Password**: 強力なパスワードを設定（**重要**: 安全な場所に保管）
   - **Region**: 最も近いリージョンを選択（例: `Northeast Asia (Tokyo)`）
   - **Pricing Plan**: まずは「Free」プランで開始

3. 「Create new project」をクリック
4. プロジェクトの作成が完了するまで待機（1-2分）

### 1.3. プロジェクト情報の取得

プロジェクトが作成されたら、以下の情報を取得：

1. **Project URL**:
   - Settings → API → Project URL
   - 例: `https://xxxxxxxxxxxxx.supabase.co`

2. **anon public key**:
   - Settings → API → anon public key
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. **service_role secret key**（オプション、Rustバックエンドで使用する場合）:
   - Settings → API → service_role secret key
   - **注意**: このキーは秘密にしてください。クライアントサイドでは使用しません

## ステップ2: データベーススキーマの作成

### 2.1. SQL Editorを開く

1. Supabaseダッシュボードの左側メニューから「SQL Editor」をクリック
2. 「New query」をクリック

### 2.2. スキーマ作成スクリプトの実行

1. `scripts/supabase/create_schema.sql`の内容をコピー
2. SQL Editorに貼り付け
3. 「Run」ボタンをクリック（または `Cmd + Enter` / `Ctrl + Enter`）
4. エラーがないことを確認

**確認項目**:
- すべてのテーブルが作成された
- エラーメッセージが表示されていない
- 「Success. No rows returned」と表示される

### 2.3. テーブルの確認

1. 左側メニューから「Table Editor」をクリック
2. 以下のテーブルが作成されていることを確認：
   - `organizations`
   - `organizationMembers`
   - `entities`
   - `relations`
   - `topics`
   - その他の主要テーブル

## ステップ3: Realtimeの有効化

### 3.1. Realtimeスクリプトの実行

1. SQL Editorで「New query」をクリック
2. `scripts/supabase/enable_realtime.sql`の内容をコピー
3. SQL Editorに貼り付け
4. 「Run」ボタンをクリック

**確認項目**:
- エラーメッセージが表示されていない
- 「Success. No rows returned」と表示される

### 3.2. Realtimeの確認（オプション）

1. 左側メニューから「Database」→「Replication」をクリック
2. 「Publications」タブで`supabase_realtime`を確認
3. 主要なテーブルが追加されていることを確認

## ステップ4: Row Level Security (RLS) の設定

### 4.1. RLSスクリプトの実行

1. SQL Editorで「New query」をクリック
2. `scripts/supabase/setup_rls.sql`の内容をコピー
3. SQL Editorに貼り付け
4. 「Run」ボタンをクリック

**確認項目**:
- エラーメッセージが表示されていない
- 「Success. No rows returned」と表示される

### 4.2. RLSの確認（オプション）

1. 左側メニューから「Authentication」→「Policies」をクリック
2. 各テーブルでRLSが有効になっていることを確認
3. ポリシーが作成されていることを確認

## ステップ5: 環境変数の設定

### 5.1. .env.localファイルの作成/更新

プロジェクトルートに`.env.local`ファイルを作成（または更新）：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWV2Y3p3bWlybGlwY2JwdHN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMjE2MDUsImV4cCI6MjA4MjY5NzYwNX0.Su-XuXMykMChwW4W6b6BtDGruJUhfh70KPqn91MLKQM
```

**重要**:
- `NEXT_PUBLIC_SUPABASE_URL`: ステップ1.3で取得したProject URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: ステップ1.3で取得したanon public key
- `.env.local`ファイルは`.gitignore`に含まれているため、Gitにコミットされません

### 5.2. 環境変数の確認

```bash
# 環境変数が正しく設定されているか確認（オプション）
cat .env.local
```

## ステップ6: アプリケーションの再起動

### 6.1. アプリケーションの停止

現在実行中のTauriアプリケーションを停止：
- ターミナルで `Ctrl + C`

### 6.2. アプリケーションの再起動

```bash
npm run tauri:dev
```

## ステップ7: 設定の検証

### 7.1. 設定検証ページでの確認

アプリケーション内で以下のページにアクセス：
- `/supabase-config-check`

**確認項目**:
- [ ] データソースが「✅ Supabase」と表示されている
- [ ] Supabase URLが正しく表示されている
- [ ] APIキーが「✅ 設定済み」と表示されている
- [ ] 接続状態が「✅ 接続成功」と表示されている
- [ ] エラーや警告が表示されていない
- [ ] 「✅ 設定は正常です」と表示されている

### 7.2. エラーが表示される場合

**エラー: "Supabase環境変数が設定されていません"**
- `.env.local`ファイルが正しく作成されているか確認
- 環境変数名が正しいか確認（`NEXT_PUBLIC_`プレフィックスが必要）

**エラー: "Supabase接続エラー"**
- Supabase URLが正しいか確認
- APIキーが正しいか確認
- ネットワーク接続を確認
- Supabaseプロジェクトが正常に動作しているか確認

**エラー: "Row Level Security policy violation"**
- RLSスクリプトが正しく実行されたか確認
- ポリシーが正しく作成されているか確認

## ステップ8: リアルタイム同期の確認

### 8.1. 動作確認ページでの確認

1. アプリケーション内で`/supabase-test`にアクセス
2. 複数のTauriアプリケーションウィンドウを開く（同じアプリを複数起動）
3. 一方で組織を追加・更新すると、他方にリアルタイムで反映されることを確認

### 8.2. 既存ページでの確認

1. `/organization`ページにアクセス
2. 複数のウィンドウで同じページを開く
3. 一方でデータを更新すると、他方にリアルタイムで反映されることを確認

## トラブルシューティング

### データベーススキーマの作成に失敗する

- SQLスクリプトを一度にすべて実行せず、テーブルごとに分割して実行
- エラーメッセージを確認して、問題のあるテーブルを特定
- 既存のテーブルがある場合は、`DROP TABLE`で削除してから再作成

### Realtimeが動作しない

- SupabaseプロジェクトでRealtimeが有効になっているか確認
- テーブルでRealtimeが有効化されているか確認
- ブラウザのコンソールでエラーを確認

### 接続エラーが発生する

- Supabase URLとAPIキーが正しいか確認
- ネットワーク接続を確認
- Supabaseプロジェクトのステータスを確認（ダッシュボードで確認）

## 次のステップ

すべての確認が完了したら：

1. **既存機能の統合**
   - `useOrganizationDataWithRealtime`を使用してリアルタイム同期を有効化
   - 詳細は[統合ガイド: INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)を参照

2. **データ移行**（オプション）
   - 既存のSQLiteデータをSupabaseに移行
   - データ移行スクリプトを作成（将来実装予定）

3. **本番環境への移行準備**
   - パフォーマンステスト
   - セキュリティ設定の確認

