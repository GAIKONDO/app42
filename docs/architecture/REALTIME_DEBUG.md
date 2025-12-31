# リアルタイム同期のデバッグガイド

## 現在の状況

- ✅ データの保存と読み込みは正常に動作
- ⚠️ リアルタイム同期が動作していない（再読み込みが必要）

## 確認手順

### 1. ブラウザのコンソールでログを確認

開発者ツールのコンソールで以下のログが表示されることを確認：

```
RealtimeSync: テーブル "organizations" の購読を開始します
RealtimeSync: テーブル "organizations" の購読に成功しました
```

### 2. ネットワークタブでWebSocket接続を確認

1. 開発者ツールの「Network」タブを開く
2. 「WS」フィルターを選択
3. SupabaseへのWebSocket接続が確立されているか確認

### 3. SupabaseでRealtimeが有効化されているか確認

1. Supabaseダッシュボードの「Database」→「Replication」を開く
2. 「Publications」タブで`supabase_realtime`を確認
3. `organizations`テーブルが追加されていることを確認

### 4. 手動で購読を確認

開発者ツールのコンソールで以下のコードを実行：

```javascript
// 環境変数を確認
console.log('USE_SUPABASE:', process.env.NEXT_PUBLIC_USE_SUPABASE);
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
```

## 次のステップ

1. **アプリケーションを再起動**
   - 修正したコードを反映するため、アプリケーションを再起動してください

2. **コンソールログを確認**
   - リアルタイム同期の購読が開始されているか確認
   - エラーメッセージがないか確認

3. **リアルタイム同期をテスト**
   - 複数のタブで同じページを開く
   - 一方で組織を追加すると、他方に自動的に反映されることを確認

## トラブルシューティング

### 購読が開始されない場合

- 環境変数が正しく設定されているか確認
- SupabaseでRealtimeが有効化されているか確認

### 購読は開始されるが変更が検出されない場合

- WebSocket接続が確立されているか確認
- テーブルでRealtimeが有効化されているか確認
- ペイロードの形式が正しいか確認

