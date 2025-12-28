# BM25ハイブリッド検索の使用方法

> **📋 ステータス**: 実装済み  
> **📅 作成日**: 2025-12-11  
> **👤 用途**: BM25ハイブリッド検索の使用方法ガイド

## 概要

BM25ハイブリッド検索は、ベクトル検索（ChromaDB）とキーワード検索（BM25）を組み合わせた検索方式です。固有名詞や専門用語の検索精度を向上させます。

## 基本的な使用方法

### デフォルト（ベクトル検索のみ）

既存のコードはそのまま動作します。デフォルトではベクトル検索のみが使用されます。

```typescript
import { searchKnowledgeGraph } from '@/lib/knowledgeGraphRAG';

// 既存のコード（変更不要）
const results = await searchKnowledgeGraph(
  'トヨタ自動車',
  10,
  { organizationId: 'org-123' }
);
```

### ハイブリッド検索を有効化

ハイブリッド検索を使用する場合は、`hybridConfig`パラメータを指定します。

```typescript
import { searchKnowledgeGraph } from '@/lib/knowledgeGraphRAG';
import { DEFAULT_HYBRID_CONFIG } from '@/lib/knowledgeGraphRAG/hybridSearch';

// ハイブリッド検索を有効化（ベクトル検索 + BM25検索）
const results = await searchKnowledgeGraph(
  'トヨタ自動車',
  10,
  { organizationId: 'org-123' },
  true, // useCache
  10000, // timeoutMs
  DEFAULT_HYBRID_CONFIG // ハイブリッド検索設定
);
```

### カスタム設定

検索の重みを調整できます。

```typescript
import { searchKnowledgeGraph } from '@/lib/knowledgeGraphRAG';
import type { HybridSearchConfig } from '@/lib/knowledgeGraphRAG/hybridSearch';

// BM25を重視する設定（固有名詞検索に最適）
const bm25FocusedConfig: HybridSearchConfig = {
  useBM25: true,
  useVector: true,
  weights: {
    vector: 0.3,  // ベクトル検索の重み
    bm25: 0.7,    // BM25検索の重み
  },
};

const results = await searchKnowledgeGraph(
  'トヨタ自動車',
  10,
  { organizationId: 'org-123' },
  true,
  10000,
  bm25FocusedConfig
);
```

### BM25検索のみ

ベクトル検索を無効にして、BM25検索のみを使用することもできます。

```typescript
const bm25OnlyConfig: HybridSearchConfig = {
  useBM25: true,
  useVector: false,
  weights: {
    vector: 0.0,
    bm25: 1.0,
  },
};

const results = await searchKnowledgeGraph(
  'トヨタ自動車',
  10,
  { organizationId: 'org-123' },
  true,
  10000,
  bm25OnlyConfig
);
```

## 個別の検索関数での使用

エンティティ、リレーション、トピックの個別検索でもハイブリッド検索を使用できます。

```typescript
import { searchEntities } from '@/lib/knowledgeGraphRAG/searchEntities';
import { DEFAULT_HYBRID_CONFIG } from '@/lib/knowledgeGraphRAG/hybridSearch';

// エンティティ検索でハイブリッド検索を使用
const entityResults = await searchEntities(
  'トヨタ自動車',
  10,
  { organizationId: 'org-123' },
  DEFAULT_WEIGHTS,
  DEFAULT_HYBRID_CONFIG
);
```

## パラメータの説明

### HybridSearchConfig

```typescript
interface HybridSearchConfig {
  useBM25: boolean;      // BM25検索を使用するか
  useVector: boolean;    // ベクトル検索を使用するか
  weights: {
    vector: number;      // ベクトル検索の重み（0.0-1.0）
    bm25: number;        // BM25検索の重み（0.0-1.0）
  };
}
```

### デフォルト設定

```typescript
DEFAULT_HYBRID_CONFIG = {
  useBM25: true,
  useVector: true,
  weights: {
    vector: 0.6,  // ベクトル検索をやや重視
    bm25: 0.4,    // BM25検索も使用
  },
};
```

## 使用例

### 例1: 固有名詞の検索

固有名詞を検索する場合は、BM25を重視する設定が効果的です。

```typescript
const config: HybridSearchConfig = {
  useBM25: true,
  useVector: true,
  weights: {
    vector: 0.3,
    bm25: 0.7,
  },
};

const results = await searchKnowledgeGraph(
  'トヨタ自動車',
  10,
  { organizationId: 'org-123' },
  true,
  10000,
  config
);
```

### 例2: 概念的な検索

概念的な検索の場合は、ベクトル検索を重視する設定が効果的です。

```typescript
const config: HybridSearchConfig = {
  useBM25: true,
  useVector: true,
  weights: {
    vector: 0.7,
    bm25: 0.3,
  },
};

const results = await searchKnowledgeGraph(
  '持続可能な開発',
  10,
  { organizationId: 'org-123' },
  true,
  10000,
  config
);
```

## パフォーマンス

- **BM25検索**: 初回検索時にインデックス構築が必要（数秒かかる場合がある）
- **ハイブリッド検索**: ベクトル検索とBM25検索を並列実行するため、検索時間が若干増加する可能性がある
- **メモリ使用量**: BM25インデックスはメモリ上に保持されるため、メモリ使用量が増加する

## 注意事項

1. **後方互換性**: 既存のコードは変更不要です。デフォルトではベクトル検索のみが使用されます。
2. **パフォーマンス**: 大量データの場合、BM25インデックス構築に時間がかかる場合があります。
3. **メモリ**: BM25インデックスはメモリ上に保持されるため、大量データの場合はメモリ使用量に注意してください。

## トラブルシューティング

### BM25検索が結果を返さない

- `searchableText`カラムが正しく設定されているか確認してください
- 検索クエリが適切にトークン化されているか確認してください

### 検索速度が遅い

- 初回検索時はインデックス構築に時間がかかります
- 2回目以降の検索は高速になります
- 大量データの場合は、検索範囲を限定（`organizationId`を指定）することを推奨します

## 関連ドキュメント

- [BM25とルーター実装計画](./BM25_ROUTER_IMPLEMENTATION_PLAN.md) - 実装計画の詳細
- [RAG検索システム評価レポート](./RAG_SEARCH_EVALUATION.md) - 検索システムの評価

