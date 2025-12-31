# リアルタイム同期のトラブルシューティング

## 問題: リアルタイム同期が動作しない

データの保存と読み込みは正常に動作しているが、リアルタイム同期が動作しない場合の対処法です。

## 確認事項

### 1. SupabaseでRealtimeが有効化されているか

1. Supabaseダッシュボードにアクセス
2. 「Database」→「Replication」をクリック
3. 「Publications」タブで`supabase_realtime`を確認
4. 主要なテーブル（`organizations`など）が追加されていることを確認

### 2. ブラウザのコンソールでエラーを確認

1. 開発者ツールを開く（`Cmd + Option + I` / `Ctrl + Shift + I`）
2. 「Console」タブを開く
3. 以下のログが表示されているか確認：
   - `RealtimeSync: テーブル "organizations" の購読を開始します`
   - `RealtimeSync: テーブル "organizations" の購読に成功しました`
   - `RealtimeSync: テーブル "organizations" で変更を検出`

### 3. ネットワークタブでWebSocket接続を確認

1. 開発者ツールの「Network」タブを開く
2. 「WS」フィルターを選択
3. SupabaseへのWebSocket接続が確立されているか確認

### 4. 環境変数が正しく設定されているか

```bash
# .env.localファイルを確認
cat .env.local
```

以下の環境変数が設定されていることを確認：
- `NEXT_PUBLIC_USE_SUPABASE=true`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## 解決方法

### 方法1: Realtimeスクリプトの再実行

1. Supabaseダッシュボードの「SQL Editor」を開く
2. `scripts/supabase/enable_realtime.sql`の内容を再実行

### 方法2: ブラウザの再読み込み

1. アプリケーションを完全に再起動
2. ブラウザのキャッシュをクリア（`Cmd + Shift + R` / `Ctrl + Shift + R`）

### 方法3: 開発者ツールで確認

1. 開発者ツールのコンソールで以下のコマンドを実行：
   ```javascript
   // 環境変数を確認
   console.log('USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
   console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   ```

2. エラーメッセージを確認

## 期待される動作

### 正常な場合

1. **ページ読み込み時**:
   - コンソールに `RealtimeSync: テーブル "organizations" の購読を開始します` が表示される
   - コンソールに `RealtimeSync: テーブル "organizations" の購読に成功しました` が表示される

2. **データ変更時**:
   - 一方のタブで組織を追加すると、他方のタブに自動的に反映される
   - コンソールに `RealtimeSync: テーブル "organizations" で変更を検出` が表示される

### 異常な場合

1. **エラーメッセージが表示される**:
   - コンソールでエラーメッセージを確認
   - エラーメッセージに基づいて対処

2. **購読が開始されない**:
   - 環境変数が正しく設定されているか確認
   - SupabaseでRealtimeが有効化されているか確認

3. **変更が検出されない**:
   - WebSocket接続が確立されているか確認
   - テーブルでRealtimeが有効化されているか確認

## デバッグ方法

### コンソールログの確認

リアルタイム同期の動作を確認するため、以下のログが表示されることを確認：

```
RealtimeSync: テーブル "organizations" の購読を開始します
RealtimeSync: テーブル "organizations" の購読に成功しました
RealtimeSync: テーブル "organizations" で変更を検出 { eventType: 'INSERT', ... }
```

### 手動での購読確認

開発者ツールのコンソールで以下のコードを実行して、手動で購読を確認：

```javascript
// Supabaseクライアントを直接使用して購読を確認
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const channel = supabase
  .channel('test-channel')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'organizations',
  }, (payload) => {
    console.log('手動購読で変更を検出:', payload);
  })
  .subscribe();

// 購読ステータスを確認
channel.subscribe((status) => {
  console.log('購読ステータス:', status);
});
```

## 次のステップ

リアルタイム同期が正常に動作することを確認したら：

1. **既存機能への統合**
   - `useOrganizationDataWithRealtime`を使用してリアルタイム同期を有効化
   - 詳細は[統合ガイド: INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)を参照

2. **パフォーマンステスト**
   - 複数のタブで同時に操作して、リアルタイム同期の遅延を確認
   - 大量のデータがある場合の動作を確認

