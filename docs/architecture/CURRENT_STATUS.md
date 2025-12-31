# 現在の状態確認

## データソースの確認方法

### 方法1: Supabase設定確認ページで確認（推奨）

ブラウザで以下のURLにアクセス：
```
/supabase-config-check
```

このページで以下が表示されます：
- **データソース**: Supabase または ローカルSQLite
- **接続状態**: 接続成功 または 接続失敗

### 方法2: ブラウザのコンソールで確認

開発者ツールのコンソール（`Cmd + Option + I` / `Ctrl + Shift + I`）で以下を実行：

```javascript
console.log('USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

### 方法3: リアルタイム同期の動作で確認

**リアルタイム同期が動作している場合 = Supabase使用中**

確認方法：
1. 複数のタブで組織管理ページ（`/organization`）を開く
2. 一方のタブで組織を追加/編集/削除
3. **他方のタブに自動的に反映される** → Supabase使用中 ✅
4. **反映されない（再読み込みが必要）** → ローカルSQLite使用中

## 現在の状態の判断

### ✅ Supabase使用中の場合

以下の条件がすべて満たされている場合：
- `/supabase-config-check`で「データソース: Supabase」と表示される
- `/supabase-config-check`で「接続状態: ✅ 接続成功」と表示される
- リアルタイム同期が動作している（複数タブで自動反映される）
- コンソールに `RealtimeSync: テーブル "organizations" の購読に成功しました` が表示される

### ❌ ローカルSQLite使用中の場合

以下の条件のいずれかが満たされている場合：
- `/supabase-config-check`で「データソース: ローカルSQLite」と表示される
- リアルタイム同期が動作していない（再読み込みが必要）
- `.env.local`ファイルが存在しない、または`NEXT_PUBLIC_USE_SUPABASE=true`が設定されていない

## 環境変数の設定

Supabaseを使用するには、プロジェクトルートに`.env.local`ファイルを作成し、以下を記述：

```
NEXT_PUBLIC_USE_SUPABASE=true
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**重要**: 環境変数を変更した後は、アプリケーションを再起動する必要があります。

