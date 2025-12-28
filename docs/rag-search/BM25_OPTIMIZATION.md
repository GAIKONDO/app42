# BM25検索の最適化ガイド

> **📋 ステータス**: 実装済み  
> **📅 作成日**: 2025-12-11  
> **👤 用途**: BM25検索の最適化とパフォーマンス向上

## 概要

BM25検索のパフォーマンスと精度を向上させるための最適化機能です。

## 実装済みの最適化機能

### 1. BM25インデックスのキャッシュ

検索パフォーマンス向上のため、構築済みのBM25インデックスをキャッシュします。

**効果**:
- 初回検索: インデックス構築が必要（数秒）
- 2回目以降: キャッシュから取得（数ミリ秒）

**使用方法**:
```typescript
import { bm25IndexCache } from '@/lib/knowledgeGraphRAG';

// キャッシュの統計情報を取得
const stats = bm25IndexCache.getStats();
console.log('キャッシュサイズ:', stats.size);
console.log('キャッシュエントリ:', stats.entries);

// キャッシュをクリア
bm25IndexCache.clear();

// キャッシュ設定を変更
bm25IndexCache.setConfig({
  maxCacheSize: 20, // 最大キャッシュ数
  ttl: 60 * 60 * 1000, // TTL: 1時間
});
```

### 2. キャッシュの無効化

データ更新時にキャッシュを無効化して整合性を保ちます。

**使用方法**:
```typescript
import {
  invalidateEntityCache,
  invalidateRelationCache,
  invalidateTopicCache,
  invalidateAllCache,
} from '@/lib/knowledgeGraphRAG';

// エンティティ更新時にキャッシュを無効化
await updateEntity(entityId, updates);
invalidateEntityCache(organizationId);

// リレーション更新時にキャッシュを無効化
await updateRelation(relationId, updates);
invalidateRelationCache(organizationId);

// トピック更新時にキャッシュを無効化
await updateTopic(topicId, updates);
invalidateTopicCache(organizationId);

// すべてのキャッシュを無効化
invalidateAllCache();
```

### 3. BM25パラメータの自動調整

検索結果の品質に基づいてパラメータを最適化します。

**使用方法**:
```typescript
import {
  tuneBM25Parameters,
  RECOMMENDED_BM25_CONFIG,
} from '@/lib/knowledgeGraphRAG';

// テストクエリと期待される結果を準備
const testQueries = [
  {
    query: 'トヨタ自動車',
    expectedResults: ['entity-123', 'entity-456'], // 期待される結果のID
    searchFunction: async (query, config) => {
      // BM25検索を実行（configを使用）
      return await searchEntitiesBM25(query, 10, undefined, config);
    },
  },
  // 複数のテストクエリを追加
];

// パラメータを調整
const result = await tuneBM25Parameters(testQueries);
console.log('最適パラメータ:', {
  k1: result.k1,
  b: result.b,
  score: result.score,
});
```

## パラメータの推奨値

### 一般的なドキュメント

```typescript
import { RECOMMENDED_BM25_CONFIG } from '@/lib/knowledgeGraphRAG';

// k1: 1.5, b: 0.75
const config = RECOMMENDED_BM25_CONFIG;
```

### 短いドキュメント（タイトル、名前など）

```typescript
import { SHORT_DOCUMENT_CONFIG } from '@/lib/knowledgeGraphRAG';

// k1: 1.2, b: 0.5
const config = SHORT_DOCUMENT_CONFIG;
```

### 長いドキュメント（コンテンツ、説明など）

```typescript
import { LONG_DOCUMENT_CONFIG } from '@/lib/knowledgeGraphRAG';

// k1: 2.0, b: 1.0
const config = LONG_DOCUMENT_CONFIG;
```

## パフォーマンス最適化のヒント

### 1. キャッシュの活用

- 同じフィルター条件で複数回検索する場合は、キャッシュが効果的
- キャッシュサイズを適切に設定（デフォルト: 10件）

### 2. 検索範囲の限定

- `organizationId`を指定して検索範囲を限定
- 大量データの場合は、フィルターを活用

### 3. インデックス構築の最適化

- 初回検索時のみインデックス構築が必要
- 2回目以降はキャッシュから取得されるため高速

## トラブルシューティング

### キャッシュが効かない

- フィルター条件が異なる場合は、別のキャッシュエントリとして扱われます
- キャッシュの統計情報を確認してください

### パラメータ調整がうまくいかない

- テストクエリの数を増やしてください（最低3-5件推奨）
- 期待される結果を正確に指定してください

### メモリ使用量が増加

- キャッシュサイズを調整してください
- 定期的にキャッシュをクリアしてください

## 関連ドキュメント

- [BM25使用方法](./BM25_USAGE.md) - BM25検索の基本的な使用方法
- [BM25動作確認ガイド](./BM25_TESTING_GUIDE.md) - 動作確認手順

