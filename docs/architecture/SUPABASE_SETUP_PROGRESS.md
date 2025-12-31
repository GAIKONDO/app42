# Supabaseセットアップ進捗

## ✅ 完了したステップ

- [x] Supabaseプロジェクトの作成
- [x] プロジェクトURLの取得: `https://uxuevczwmirlipcbptsx.supabase.co`
- [x] APIキーの取得（anon public key）
- [x] 環境変数の設定（`.env.local`）
- [x] データベーススキーマの作成

## 🔄 次のステップ

### ステップ1: Realtimeの有効化

1. Supabaseダッシュボードの「SQL Editor」を開く
2. 「New query」をクリック
3. `scripts/supabase/enable_realtime.sql`の内容をコピーして貼り付け
4. 「Run」ボタンをクリック
5. 「Success. No rows returned.」と表示されることを確認

### ステップ2: Row Level Security (RLS) の設定

1. SQL Editorで「New query」をクリック
2. `scripts/supabase/setup_rls.sql`の内容をコピーして貼り付け
3. 「Run」ボタンをクリック
4. 「Success. No rows returned.」と表示されることを確認

### ステップ3: テーブルの確認（オプション）

1. 左側メニューから「Table Editor」をクリック
2. 以下のテーブルが作成されていることを確認：
   - `organizations`
   - `organizationMembers`
   - `entities`
   - `relations`
   - `topics`
   - その他の主要テーブル

### ステップ4: アプリケーションの再起動

```bash
# 現在のアプリケーションを停止（Ctrl+C）
# 再度起動
npm run tauri:dev
```

### ステップ5: 設定の検証

アプリケーション内で`/supabase-config-check`にアクセスして確認：
- [ ] データソースが「✅ Supabase」と表示される
- [ ] 接続状態が「✅ 接続成功」と表示される
- [ ] エラーや警告が表示されない

## 📝 メモ

- データベーススキーマの作成: ✅ 完了
- Realtimeの有効化: ⏳ 次
- RLSの設定: ⏳ 次
- アプリケーションの再起動: ⏳ 次
- 設定の検証: ⏳ 次

