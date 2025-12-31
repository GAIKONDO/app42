# Supabaseクイックセットアップガイド

プロジェクトURL: `https://uxuevczwmirlipcbptsx.supabase.co`

## 次のステップ

### 1. APIキーの取得

1. Supabaseダッシュボードにアクセス
2. 左側メニューから「Settings」→「API」をクリック
3. 以下の情報を取得：
   - **Project URL**: `https://uxuevczwmirlipcbptsx.supabase.co`（既に取得済み）
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（この値を取得）

### 2. データベーススキーマの作成

1. 左側メニューから「SQL Editor」をクリック
2. 「New query」をクリック
3. `scripts/supabase/create_schema.sql`の内容をコピーして貼り付け
4. 「Run」ボタンをクリック（または `Cmd + Enter`）
5. エラーがないことを確認

### 3. Realtimeの有効化

1. SQL Editorで「New query」をクリック
2. `scripts/supabase/enable_realtime.sql`の内容をコピーして実行

### 4. Row Level Security (RLS) の設定

1. SQL Editorで「New query」をクリック
2. `scripts/supabase/setup_rls.sql`の内容をコピーして実行

### 5. 環境変数の設定

プロジェクトルートに`.env.local`ファイルを作成（または更新）：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://uxuevczwmirlipcbptsx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ここにanon public keyを貼り付け
```

### 6. アプリケーションの再起動

```bash
# 現在のアプリケーションを停止（Ctrl+C）
# 再度起動
npm run tauri:dev
```

### 7. 設定の検証

アプリケーション内で`/supabase-config-check`にアクセスして確認

