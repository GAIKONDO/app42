# リレーション埋め込みのデバッグガイド

## 問題

`relation_embeddings`テーブルにレコードが1件も保存されていない。

## 確認事項

### 1. リレーション作成時のログ確認

リレーションを作成した際に、ブラウザのコンソールで以下のログが表示されるか確認してください：

```
📝 [createRelation] Supabase経由でリレーションを作成します: ...
✅ [createRelation] Supabase経由でリレーションを作成しました: ...
[saveRelationEmbeddingAsync] リレーション埋め込み生成開始: ...
[saveRelationEmbeddingAsync] 埋め込み保存開始: ...
✅ [saveRelationEmbedding] Supabaseにリレーション埋め込みを保存しました: ...
✅ [saveRelationEmbeddingAsync] リレーション埋め込み生成完了: ...
```

または、エラーログ：

```
❌ [createRelation] リレーション埋め込みの生成に失敗しました（続行します）: ...
❌ [saveRelationEmbeddingAsync] リレーション ... の埋め込み生成エラー: ...
```

### 2. organizationIdの確認

リレーション作成時に`organizationId`が設定されているか確認してください。

**確認方法：**
1. Supabaseダッシュボードで`relations`テーブルを開く
2. 作成されたリレーションの`organizationId`カラムを確認
3. `organizationId`が`NULL`の場合は、埋め込み生成がスキップされます

### 3. 環境変数の確認

ベクトル検索にSupabaseを使用する設定になっているか確認：

```env
NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true
```

または

```env
NEXT_PUBLIC_USE_SUPABASE=true
```

### 4. 手動で埋め込みを生成する

既存のリレーションの埋め込みを手動で生成する場合：

```typescript
// ブラウザのコンソールで実行
import { saveRelationEmbeddingAsync } from '@/lib/relationEmbeddings';

// リレーションIDと組織IDを指定
await saveRelationEmbeddingAsync('relation_xxx', 'topic_xxx', 'org_xxx');
```

## よくある問題

### 問題1: organizationIdが設定されていない

**症状：**
- リレーションは作成されるが、埋め込みが生成されない
- コンソールに「organizationIdもcompanyIdも設定されていないため、埋め込み生成をスキップ」と表示される

**解決方法：**
- リレーション作成時に`organizationId`を必ず設定する

### 問題2: エラーが発生しているが無視されている

**症状：**
- コンソールにエラーログが表示される
- リレーションは作成されるが、埋め込みが保存されない

**解決方法：**
- エラーログの内容を確認
- よくある原因：
  - Supabase接続エラー
  - 埋め込み生成エラー（OpenAI APIキーなど）
  - テーブルスキーマの不一致

### 問題3: ベクトル検索バックエンドがChromaDBになっている

**症状：**
- 環境変数が正しく設定されていない
- ChromaDBに保存されている（Supabaseには保存されない）

**解決方法：**
- `.env.local`ファイルで`NEXT_PUBLIC_USE_SUPABASE_VECTOR_SEARCH=true`を設定
- アプリケーションを再起動

## デバッグ手順

1. **リレーションを作成**
   - アプリケーションでリレーションを作成

2. **コンソールログを確認**
   - ブラウザの開発者ツール（F12）を開く
   - コンソールタブでログを確認
   - `[saveRelationEmbeddingAsync]`で始まるログを探す

3. **Supabaseダッシュボードで確認**
   - `relations`テーブル：リレーションが作成されているか
   - `relation_embeddings`テーブル：埋め込みが保存されているか

4. **エラーログを確認**
   - エラーが表示されている場合は、エラー内容を確認
   - エラーメッセージから原因を特定

## トラブルシューティング

### ログが表示されない場合

- リレーション作成時に`saveRelationEmbeddingAsync`が呼び出されていない可能性
- `lib/relationApi.ts`の`createRelation`関数を確認

### エラーが表示される場合

- エラーメッセージの内容を確認
- よくあるエラー：
  - `organizationIdもcompanyIdも設定されていないため、埋め込み生成をスキップ`
  - `リレーションが見つかりません`
  - `エンティティ埋め込みの保存に失敗しました`

### 埋め込みが生成されても保存されない場合

- Supabaseの接続設定を確認
- `relation_embeddings`テーブルのスキーマを確認
- RLS（Row Level Security）ポリシーを確認

