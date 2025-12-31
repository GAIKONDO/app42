# データソースの確認方法

## 現在のデータソースを確認する方法

### 方法1: ブラウザのコンソールで確認

開発者ツールのコンソールで以下のコードを実行：

```javascript
// 環境変数を確認
console.log('USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定');
```

### 方法2: Supabase動作確認ページで確認

`/supabase-config-check`ページにアクセスして、データソースの状態を確認：

1. ブラウザで `/supabase-config-check` にアクセス
2. 「データソース」セクションで「Supabase」または「ローカルSQLite」が表示される
3. 「接続状態」で接続が成功しているか確認

### 方法3: リアルタイム同期の動作で確認

リアルタイム同期が動作している場合、Supabaseを使用しています：

1. 複数のタブで組織管理ページを開く
2. 一方で組織を追加/編集
3. 他方に自動的に反映される → Supabase使用中
4. 反映されない → ローカルSQLite使用中

### 方法4: 環境変数ファイルの確認

プロジェクトルートに`.env.local`ファイルが存在するか確認：

```bash
# プロジェクトルートで実行
cat .env.local
```

以下の内容が含まれている必要があります：

```
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## データソースの切り替え

### Supabaseに切り替える

1. `.env.local`ファイルを作成（プロジェクトルート）
2. 以下の内容を記述：

```
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. アプリケーションを再起動

### ローカルSQLiteに戻す

1. `.env.local`ファイルを削除、または
2. `NEXT_PUBLIC_USE_SUPABASE=false`に設定
3. アプリケーションを再起動

## 注意事項

- 環境変数の変更後は、アプリケーションの再起動が必要です
- Tauriアプリの場合は、完全に終了してから再起動してください
- `.env.local`ファイルは`.gitignore`に含まれているため、Gitにはコミットされません

