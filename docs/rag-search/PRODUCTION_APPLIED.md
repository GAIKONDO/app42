# 本番環境への適用完了

> **📋 ステータス**: 適用完了  
> **📅 適用日**: 2025-12-11  
> **👤 用途**: 本番環境への適用状況の記録

## 適用完了内容

### ✅ 実装完了機能

1. **BM25検索**: 実装完了、本番環境で有効
2. **クエリルーター**: 実装完了、本番環境で有効
3. **ハイブリッド検索**: 実装完了、本番環境で有効
4. **最適化機能**: キャッシュ、無効化、パラメータ調整機能を実装

### ✅ 本番環境への統合

1. **useRAGSearchフック**: クエリルーターを自動的に使用
2. **MCPツール**: クエリルーターを自動的に使用
3. **設定管理**: localStorageで設定を管理、設定ページから変更可能

## デフォルト設定

本番環境では、以下の設定がデフォルトで有効になっています:

```typescript
{
  enableBM25: true,              // BM25検索を有効化
  enableRouter: true,             // クエリルーターを有効化
  useHybridSearchByDefault: true  // デフォルトでハイブリッド検索を使用
}
```

## 設定の変更方法

### 設定ページから変更

1. ブラウザで `/settings` にアクセス
2. 「検索設定」タブを選択
3. 各設定のチェックボックスを変更
4. 「保存」ボタンをクリック

### プログラムから変更

```typescript
import { setSearchConfig } from '@/lib/knowledgeGraphRAG';

// 設定を変更
setSearchConfig({
  enableBM25: false,  // BM25検索を無効化
  enableRouter: true,
  useHybridSearchByDefault: false,
});
```

## 適用された変更点

### 1. useRAGSearchフック

- クエリルーターが自動的に使用されるように更新
- 設定に基づいて検索戦略を自動選択

### 2. MCPツール

- クエリルーターが自動的に使用されるように更新
- 設定に基づいて検索戦略を自動選択

### 3. searchKnowledgeGraph関数

- 設定に基づいてデフォルト動作を決定
- 後方互換性を維持（既存コードは変更不要）

## 動作確認

### 確認項目

- [x] 検索結果のスコアが向上している
- [x] 固有名詞を含むクエリで、BM25検索が効果的に機能している
- [x] クエリタイプに応じて、適切な検索戦略が選択されている
- [x] パフォーマンスが許容範囲内

## ロールバック方法

問題が発生した場合、以下の方法でロールバックできます:

### 方法1: 設定ページから無効化

1. `/settings` → 「検索設定」タブ
2. すべてのチェックボックスをオフ
3. 「保存」をクリック

### 方法2: プログラムから無効化

```typescript
import { setSearchConfig } from '@/lib/knowledgeGraphRAG';

setSearchConfig({
  enableBM25: false,
  enableRouter: false,
  useHybridSearchByDefault: false,
});
```

## モニタリング推奨事項

### 確認すべきメトリクス

1. **検索速度**: 平均検索時間が許容範囲内か
2. **検索精度**: ユーザーフィードバック、クリック率
3. **エラー率**: 検索エラーの発生率
4. **メモリ使用量**: BM25インデックスのメモリ使用量

### ログの確認

コンソールログで以下の情報を確認:

- `[searchKnowledgeGraph]`: 検索の開始と完了
- `[QueryRouter]`: クエリ分析結果
- `[BM25IndexCache]`: キャッシュの取得と保存
- `[searchEntitiesBM25]`: BM25検索の実行

## 次のステップ（オプション）

### データ更新時のキャッシュ無効化

エンティティやリレーションを更新・削除する際に、キャッシュを無効化することを推奨します:

```typescript
import { invalidateEntityCache } from '@/lib/knowledgeGraphRAG';

// エンティティ更新後
await updateEntity(entityId, updates);
invalidateEntityCache(organizationId);
```

### パラメータの調整

検索結果の品質に応じて、BM25パラメータを調整できます:

```typescript
import { tuneBM25Parameters } from '@/lib/knowledgeGraphRAG';

// テストクエリでパラメータを調整
const result = await tuneBM25Parameters(testQueries);
console.log('最適パラメータ:', result);
```

## まとめ

本番環境への適用が完了しました。以下の機能が有効になっています:

- ✅ BM25検索（デフォルト: 有効）
- ✅ クエリルーター（デフォルト: 有効）
- ✅ ハイブリッド検索（デフォルト: 有効）
- ✅ キャッシュ機能（自動）
- ✅ 設定管理（設定ページから変更可能）

問題が発生した場合は、設定ページから無効化できます。

## 関連ドキュメント

- [実装サマリー](./IMPLEMENTATION_SUMMARY.md) - 実装内容の総括
- [本番環境への適用ガイド](./PRODUCTION_DEPLOYMENT.md) - 詳細な適用手順
- [BM25使用方法](./BM25_USAGE.md) - BM25検索の使用方法
- [クエリルーター使用方法](./QUERY_ROUTER_USAGE.md) - ルーターの使用方法

