# 開発環境セットアップ手順

このドキュメントでは、Supabase移行と共同編集機能の開発環境セットアップ手順を説明します。

## 前提条件

- Node.js 18以上
- npm または yarn
- Supabaseアカウント（Supabase使用時）

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定：

```env
# Supabaseを使用する場合はtrueに設定
NEXT_PUBLIC_USE_SUPABASE=false

# SupabaseプロジェクトのURL（Supabase使用時のみ）
NEXT_PUBLIC_SUPABASE_URL=

# Supabase匿名キー（Supabase使用時のみ）
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. Supabaseプロジェクトのセットアップ（Supabase使用時）

#### 3.1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/)にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURLとAPIキーを取得
   - Settings → API → Project URL
   - Settings → API → anon/public key

#### 3.2. データベーススキーマの作成

1. Supabaseダッシュボードの「SQL Editor」を開く
2. `scripts/supabase/create_schema.sql`の内容をコピーして実行
3. スキーマが正常に作成されたことを確認

#### 3.3. Realtimeの有効化

1. `scripts/supabase/enable_realtime.sql`の内容を実行
2. または、Supabaseダッシュボードの「Database」→「Replication」から手動で有効化

#### 3.4. Row Level Security (RLS) の設定

1. `scripts/supabase/setup_rls.sql`の内容を実行
2. 本番環境では、より厳密なアクセス制御を実装してください

#### 3.5. 環境変数の更新

`.env.local`ファイルを更新：

```env
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 設定の検証

#### 4.1. 設定検証ページを使用

```bash
npm run dev
```

ブラウザで`http://localhost:3020/supabase-config-check`にアクセスして、設定を確認します。

#### 4.2. 動作確認ページを使用

`http://localhost:3020/supabase-test`にアクセスして、リアルタイム同期と共同編集機能を確認します。

### 5. 開発サーバーの起動

```bash
npm run dev
```

または、Tauriアプリケーションとして起動：

```bash
npm run tauri:dev
```

## 動作確認

### リアルタイム同期の確認

1. ブラウザで`http://localhost:3020/supabase-test`を開く
2. 別のブラウザタブまたはウィンドウで同じページを開く
3. 一方で組織を追加・更新・削除すると、他方にリアルタイムで反映されることを確認

### 共同編集機能の確認

1. 複数のブラウザで同じ組織を編集
2. 一方で保存すると、他方に競合エラーが表示されることを確認
3. 最新のデータを取得して再試行できることを確認

### 既存機能の確認

1. 既存の組織管理ページ（`/organization`）が正常に動作することを確認
2. データの読み取り・書き込みが正常に動作することを確認

## トラブルシューティング

### エラー: "Supabase環境変数が設定されていません"

`.env.local`ファイルに環境変数が正しく設定されているか確認してください。

### エラー: "Row Level Security policy violation"

RLSポリシーが正しく設定されているか確認してください。開発中は、一時的にRLSを無効化することもできます（本番環境では推奨しません）。

### リアルタイム同期が動作しない

1. SupabaseプロジェクトでRealtimeが有効になっているか確認
2. テーブルでRealtimeが有効化されているか確認
3. ブラウザのコンソールでエラーを確認
4. ネットワーク接続を確認

### データが表示されない

1. データベーススキーマが正しく作成されているか確認
2. データが実際に存在するか確認
3. RLSポリシーがデータアクセスを許可しているか確認

## 開発時の注意事項

### ローカルSQLiteとSupabaseの切り替え

環境変数`NEXT_PUBLIC_USE_SUPABASE`で切り替え可能：

- `false`または未設定: ローカルSQLiteを使用
- `true`: Supabaseを使用

### データの移行

既存のSQLiteデータをSupabaseに移行する場合は、データ移行スクリプトを使用してください（将来実装予定）。

### パフォーマンス

- 開発環境では、リアルタイム同期を必要最小限のテーブルのみで有効化
- 大量のデータがある場合は、条件付きで有効化

## 参考資料

- [セットアップガイド: ../../README_SUPABASE_SETUP.md](../../README_SUPABASE_SETUP.md)
- [統合ガイド: INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- [使用例: SUPABASE_USAGE_EXAMPLES.md](./SUPABASE_USAGE_EXAMPLES.md)
- [設計書: COLLABORATIVE_EDITING_DESIGN.md](./COLLABORATIVE_EDITING_DESIGN.md)

