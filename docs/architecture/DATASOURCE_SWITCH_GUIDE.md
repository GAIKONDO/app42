# データソースの切り替えガイド

## 問題: ローカルSQLiteデータが表示される

`.env.local`ファイルに`NEXT_PUBLIC_USE_SUPABASE=true`が設定されているにもかかわらず、ローカルのSQLiteデータが表示される場合の対処法です。

## 原因

1. **アプリケーションが再起動されていない**
   - Next.jsの環境変数は起動時に読み込まれます
   - 環境変数を変更した後は、アプリケーションを再起動する必要があります

2. **シングルトンインスタンスのキャッシュ**
   - `dataSourceInstance`はシングルトンで、一度初期化されると変更されません
   - アプリケーションを再起動することで、新しい環境変数で再初期化されます

## 解決方法

### 方法1: アプリケーションの再起動（推奨）

1. **Tauriアプリを完全に終了**
   - アプリケーションウィンドウを閉じる
   - ターミナルで`Ctrl+C`を押してプロセスを停止

2. **再起動**
   ```bash
   npm run tauri:dev
   ```

3. **確認**
   - `/supabase-config-check`ページで「データソース: ✅ Supabase」と表示されることを確認
   - 組織管理ページにSupabaseのデータ（12件）が表示されることを確認

### 方法2: ブラウザのキャッシュをクリア

1. 開発者ツールを開く（`Cmd + Option + I` / `Ctrl + Shift + I`）
2. ネットワークタブを開く
3. 「Disable cache」にチェックを入れる
4. ページを再読み込み（`Cmd + Shift + R` / `Ctrl + Shift + R`）

### 方法3: 環境変数の確認

`.env.local`ファイルの内容を確認：

```bash
cat .env.local
```

以下の内容が含まれていることを確認：

```
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 確認方法

### 1. Supabase設定確認ページ

`/supabase-config-check`ページにアクセス：
- **データソース**: ✅ Supabase
- **接続状態**: ✅ 接続成功

### 2. 組織管理ページ

`/organization`ページにアクセス：
- 表示されている組織の数が**12件**であることを確認
- これがSupabaseから取得されたデータです

### 3. ブラウザのコンソール

開発者ツールのコンソールで以下を実行：

```javascript
console.log('USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

以下のように表示されることを確認：
```
USE_SUPABASE: true
SUPABASE_URL: https://uxuevczwmirlipcbptsx.supabase.co
```

### 4. データソースのログ

アプリケーション起動時に、コンソールに以下のログが表示されることを確認：

```
[DataSource] データソースを初期化しました: Supabase
```

## トラブルシューティング

### 環境変数が読み込まれない

**原因**: Next.jsの環境変数は起動時に読み込まれます

**解決方法**:
1. アプリケーションを完全に終了
2. 再起動（`npm run tauri:dev`）
3. ブラウザのキャッシュをクリア

### ローカルSQLiteデータが表示される

**原因**: 環境変数が正しく読み込まれていない、またはアプリケーションが再起動されていない

**解決方法**:
1. `.env.local`ファイルの内容を確認
2. アプリケーションを完全に再起動
3. `/supabase-config-check`ページでデータソースを確認

### データソースが切り替わらない

**原因**: シングルトンインスタンスがキャッシュされている

**解決方法**:
1. アプリケーションを完全に終了
2. 再起動（`npm run tauri:dev`）
3. ブラウザのキャッシュをクリア

## 注意事項

- 環境変数を変更した後は、**必ずアプリケーションを再起動**してください
- Tauriアプリの場合は、完全に終了してから再起動してください
- Next.jsの環境変数はビルド時に埋め込まれるため、開発環境でも再起動が必要です

