# データソースの確認方法

## 現在の状態

### データ移行の結果

- ✅ `organizations`テーブル: 12件のレコードをSupabaseに正常にインポート

### アプリケーションのデータソース

アプリケーションがSupabaseを使用している場合、以下の条件が満たされている必要があります：

1. `.env.local`ファイルに`NEXT_PUBLIC_USE_SUPABASE=true`が設定されている
2. SupabaseのURLとAPIキーが設定されている
3. アプリケーションが再起動されている（環境変数の変更を反映するため）

## 確認方法

### 方法1: Supabase設定確認ページで確認

ブラウザで以下のURLにアクセス：
```
/supabase-config-check
```

このページで以下が表示されることを確認：
- **データソース**: ✅ Supabase
- **接続状態**: ✅ 接続成功

### 方法2: 組織管理ページで確認

1. `/organization`ページにアクセス
2. 表示されている組織の数が**12件**であることを確認
3. これがSupabaseから取得されたデータです

### 方法3: ブラウザのコンソールで確認

開発者ツールのコンソール（`Cmd + Option + I` / `Ctrl + Shift + I`）で以下を実行：

```javascript
console.log('USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

### 方法4: Supabaseダッシュボードで確認

1. Supabaseダッシュボードにアクセス
2. 「Table Editor」を開く
3. `organizations`テーブルを選択
4. **12件のレコード**が表示されることを確認

## データの流れ

### Supabase使用時

```
アプリケーション
  ↓
lib/dataSource.ts (getDataSourceInstance)
  ↓
SupabaseDataSource
  ↓
Supabase REST API
  ↓
PostgreSQL (Supabase)
```

### ローカルSQLite使用時

```
アプリケーション
  ↓
lib/dataSource.ts (getDataSourceInstance)
  ↓
LocalSQLiteDataSource
  ↓
Tauri Commands
  ↓
SQLite (data/app.db)
```

## 確認事項

### ✅ Supabase使用中の場合

- `/supabase-config-check`で「データソース: Supabase」と表示される
- 組織管理ページに**12件の組織**が表示される
- リアルタイム同期が動作している（複数タブで自動反映される）

### ❌ ローカルSQLite使用中の場合

- `/supabase-config-check`で「データソース: ローカルSQLite」と表示される
- 組織管理ページに表示される組織数が12件と異なる可能性がある
- リアルタイム同期が動作していない（再読み込みが必要）

## 注意事項

- 環境変数を変更した後は、**アプリケーションを再起動**する必要があります
- Tauriアプリの場合は、完全に終了してから再起動してください
- 移行されたデータはSupabaseに保存されているため、ローカルのSQLiteデータベース（`data/app.db`）とは独立しています

