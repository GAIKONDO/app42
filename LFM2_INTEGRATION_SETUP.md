# LFM2 8B-A1B統合セットアップガイド

## ✅ 実装完了項目

以下のファイルを作成・更新しました：

1. ✅ `lib/localModel/getAvailableModels.ts` - 新規作成
   - OllamaとLlamaCppの両方のモデルを取得する関数

2. ✅ `lib/localModel/router.ts` - 更新
   - LFM2 8B-A1Bの設定を追加
   - `isLocalModel`関数にLFM2を追加

3. ✅ `components/AIAssistantPanel/hooks/useModelSelector.ts` - 更新
   - 新しい`getAvailableLocalModels`関数を使用

## 📝 次のステップ

### ステップ1: 環境変数の設定

`.env.local`ファイルに以下を追加してください：

```bash
# LFM2 llama-server API URL
NEXT_PUBLIC_LLAMA_CPP_API_URL=http://localhost:8080
```

**注意**: `.env.local`ファイルが既に存在する場合は、上記の行を追加してください。

### ステップ2: llama-serverの起動

別ターミナルで以下を実行：

```bash
cd /Users/gaikondo/Desktop/test-app/app50_LFM2
./ai/bin/run_lfm2_server.sh ./ai/models/LFM2-8B-A1B-Q4_K_M.gguf
```

**確認**:
- サーバーが `http://localhost:8080` で起動していること
- エラーメッセージがないこと

### ステップ3: 動作確認

1. **アプリケーションを起動**
   ```bash
   cd /Users/gaikondo/Desktop/test-app/app42_ネットワークモック_Supabase
   npm run dev
   ```

2. **モデルセレクターで確認**
   - AIアシスタントパネルを開く
   - モデルタイプで「ローカル」を選択
   - 「LFM2-8B-A1B (Q4_K_M)」が表示されることを確認

3. **チャットテスト**
   - LFM2-8B-A1Bを選択
   - チャットを送信
   - 正常に応答が返ることを確認

## 🔧 トラブルシューティング

### モデルが表示されない

1. **llama-serverが起動しているか確認**
   ```bash
   curl http://localhost:8080/health
   # または
   lsof -i :8080
   ```

2. **環境変数が正しく設定されているか確認**
   - `.env.local`に`NEXT_PUBLIC_LLAMA_CPP_API_URL=http://localhost:8080`が含まれているか
   - アプリケーションを再起動（環境変数の変更を反映）

3. **ブラウザのコンソールでエラーを確認**
   - 開発者ツール（F12）を開く
   - Consoleタブでエラーメッセージを確認

### 接続エラー

**エラー**: `LlamaCpp Serverに接続できませんでした`

**解決方法**:
1. llama-serverが起動しているか確認
2. ポートが正しいか確認（デフォルト: 8080）
3. 別のポートを使用している場合は、環境変数を更新:
   ```bash
   NEXT_PUBLIC_LLAMA_CPP_API_URL=http://localhost:8081
   ```

### ストリーミングが動作しない

1. `LlamaCppServerProvider`の`supportsStreaming`が`true`であることを確認（既に実装済み）
2. ストリーミングオプションが正しく設定されているか確認
3. サーバー側のストリーミングサポートを確認

## 📋 実装チェックリスト

- [x] `getAvailableModels.ts`の作成
- [x] `router.ts`の更新
- [x] `useModelSelector.ts`の更新
- [ ] 環境変数の設定（`.env.local`に追加）
- [ ] llama-serverの起動
- [ ] アプリケーションの再起動
- [ ] モデルセレクターでの確認
- [ ] 基本的なチャット動作確認
- [ ] ストリーミング動作確認

## 🎯 次のステップ（オプション）

実装が完了したら、以下を検討：

1. **サーバー自動起動**: アプリケーション起動時にllama-serverを自動起動
2. **設定画面**: UIからモデル設定を変更可能にする
3. **複数モデル対応**: 複数のLFM2モデルを切り替え可能にする

