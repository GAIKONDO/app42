# クイックスタートガイド

このガイドでは、Supabase移行と共同編集機能をすぐに試すための手順を説明します。

## 前提条件

- ✅ 依存関係のインストール完了（`npm install`）
- Supabaseアカウント（Supabase使用時のみ）

## ステップ1: ローカルSQLiteモードで動作確認

まず、既存のローカルSQLiteモードで動作確認します。

### 1.1. 環境変数の確認

`.env.local`ファイルが存在しない場合、またはSupabaseを使用しない場合は、そのまま進めます。

### 1.2. 開発サーバーの起動

⚠️ **重要**: このアプリケーションはTauriアプリケーションです。必ずTauriアプリケーションとして起動してください。

```bash
npm run tauri:dev
```

または、起動スクリプトを使用（macOS）：

```bash
./start-dev.command
```

**注意**: `npm run dev`だけでは、Tauriコマンド（`doc_get`, `doc_set`など）が動作しません。

### 1.3. 動作確認

Tauriアプリケーションウィンドウが開いたら、アプリケーション内で以下のページにアクセス：

- **メインページ**: アプリ起動時のデフォルトページ
- **組織管理**: `/organization`（アプリ内のナビゲーションまたはURLバーでアクセス）
- **設定検証**: `/supabase-config-check`
- **動作確認**: `/supabase-test`

**注意**: ブラウザで`http://localhost:3020`に直接アクセスしても、Tauriコマンドは動作しません。

## ステップ2: Supabaseモードで動作確認（オプション）

Supabaseを使用する場合は、以下の手順を実行します。

### 2.1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセス
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキーを取得

### 2.2. データベーススキーマの作成

1. Supabaseダッシュボードの「SQL Editor」を開く
2. `scripts/supabase/create_schema.sql`の内容をコピーして実行
3. スキーマが正常に作成されたことを確認

### 2.3. RealtimeとRLSの設定

1. `scripts/supabase/enable_realtime.sql`を実行
2. `scripts/supabase/setup_rls.sql`を実行

### 2.4. 環境変数の設定

`.env.local`ファイルを作成：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2.5. 設定の検証

1. Tauriアプリケーションを再起動（`npm run tauri:dev`）
2. アプリケーション内で`/supabase-config-check`にアクセス
3. すべてのチェックが✅になることを確認

### 2.6. リアルタイム同期の確認

1. アプリケーション内で`/supabase-test`にアクセス
2. **複数のTauriアプリケーションウィンドウ**を開く（同じアプリを複数起動）
3. 一方で組織を追加・更新すると、他方にリアルタイムで反映されることを確認

**注意**: ブラウザタブではなく、Tauriアプリケーションウィンドウで確認してください。

## トラブルシューティング

### 開発サーバーが起動しない

1. ポート3020が使用中でないか確認
2. 他のプロセスを終了してから再試行

### 設定検証ページでエラーが表示される

1. `.env.local`ファイルの内容を確認
2. 環境変数が正しく設定されているか確認
3. Supabaseプロジェクトが正常に動作しているか確認

### リアルタイム同期が動作しない

1. SupabaseプロジェクトでRealtimeが有効になっているか確認
2. テーブルでRealtimeが有効化されているか確認
3. ブラウザのコンソールでエラーを確認

## 次のステップ

- [統合ガイド: INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - 既存コンポーネントへの統合
- [使用例: SUPABASE_USAGE_EXAMPLES.md](./SUPABASE_USAGE_EXAMPLES.md) - 実装例
- [開発環境セットアップ: DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - 詳細なセットアップ手順

